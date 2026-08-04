import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import dbConnect from './db';
import { ExamSession, ExamResult, SectionResult, PdfTemplate } from './models';

// In-Memory cache for downloaded font buffers (avoids Vercel filesystem trace restrictions)
let cachedFonts = null;

async function loadFonts() {
  if (cachedFonts) return cachedFonts;

  const urls = {
    interRegular: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
    outfitRegular: 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4E.ttf',
    outfitBold: 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4deyC4E.ttf'
  };

  try {
    const [interRegRes, outfitRegRes, outfitBoldRes] = await Promise.all([
      fetch(urls.interRegular),
      fetch(urls.outfitRegular),
      fetch(urls.outfitBold)
    ]);

    const [interRegBuf, outfitRegBuf, outfitBoldBuf] = await Promise.all([
      interRegRes.arrayBuffer().then(Buffer.from),
      outfitRegRes.arrayBuffer().then(Buffer.from),
      outfitBoldRes.arrayBuffer().then(Buffer.from)
    ]);

    cachedFonts = {
      interRegular: interRegBuf,
      outfitRegular: outfitRegBuf,
      outfitBold: outfitBoldBuf
    };
    return cachedFonts;
  } catch (error) {
    console.error('Error fetching font buffers at runtime:', error);
    return null;
  }
}

export async function generatePdfReport(sessionId) {
  await dbConnect();

  // Load fonts first
  const fonts = await loadFonts();

  // Fetch session, candidate, exam
  const session = await ExamSession.findById(sessionId)
    .populate('candidateId')
    .populate('examId');
  if (!session) throw new Error('Session not found');

  const candidate = session.candidateId;
  const exam = session.examId;

  // Fetch results
  const result = await ExamResult.findOne({ sessionId });
  if (!result) throw new Error('Result not calculated yet');

  const sectionResults = await SectionResult.find({ examResultId: result._id })
    .populate('sectionId');

  // Load 4 template images from MongoDB (cover, key_benefits, career_model, back_cover)
  const BASE_URL = 'https://ibssr.vercel.app';
  const DEFAULT_URLS = {
    cover:        `${BASE_URL}/uploads/template_cover.jpg`,
    key_benefits: `${BASE_URL}/uploads/template_key_benefits.jpg`,
    career_model: `${BASE_URL}/uploads/template_iceberg.jpg`,
    back_cover:   `${BASE_URL}/uploads/template_back_cover.jpg`,
  };

  // Seed or update defaults in DB
  const templateKeys = Object.keys(DEFAULT_URLS);
  for (const key of templateKeys) {
    await PdfTemplate.findOneAndUpdate(
      { key },
      { $set: { label: key, imageUrl: DEFAULT_URLS[key], updatedAt: new Date() } },
      { upsert: true }
    );
  }
  const templateDocs = await PdfTemplate.find({ key: { $in: templateKeys } });
  const tplMap = {};
  templateDocs.forEach(t => { tplMap[t.key] = t.imageUrl; });

  // Pre-fetch all 4 template image buffers in parallel (tries local file first for max quality, then HTTP fetch)
  const getTemplateBuffer = async (key, fallbackUrl) => {
    // 1. Try local file path first for crisp uncompressed resolution
    const localFileName = key === 'cover' ? 'template_cover.jpg'
      : key === 'key_benefits' ? 'template_key_benefits.jpg'
      : key === 'career_model' ? 'template_iceberg.jpg'
      : 'template_back_cover.jpg';
    
    const localPath = path.join(process.cwd(), 'public', 'uploads', localFileName);
    if (fs.existsSync(localPath)) {
      try {
        return await fs.promises.readFile(localPath);
      } catch (err) {
        console.warn(`Local file read failed for ${localFileName}, trying URL...`);
      }
    }

    // 2. Fallback to URL fetch if local file isn't present
    const targetUrl = tplMap[key] || fallbackUrl;
    try {
      const res = await fetch(targetUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error(`Fetch failed for template ${key}:`, e);
    }
    return null;
  };

  const [coverBuf, keyBenefitsBuf, careerModelBuf, backCoverBuf] = await Promise.all([
    getTemplateBuffer('cover', DEFAULT_URLS.cover),
    getTemplateBuffer('key_benefits', DEFAULT_URLS.key_benefits),
    getTemplateBuffer('career_model', DEFAULT_URLS.career_model),
    getTemplateBuffer('back_cover', DEFAULT_URLS.back_cover),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Register font buffers if downloaded successfully
    const hasFonts = !!fonts;
    if (hasFonts) {
      doc.registerFont('Outfit-Regular', fonts.outfitRegular);
      doc.registerFont('Outfit-Bold', fonts.outfitBold);
      doc.registerFont('Inter-Regular', fonts.interRegular);
    }

    const fontBold = hasFonts ? 'Outfit-Bold' : 'Helvetica-Bold';
    const fontRegular = hasFonts ? 'Inter-Regular' : 'Helvetica';
    const fontOutfitRegular = hasFonts ? 'Outfit-Regular' : 'Helvetica';

    // Helper functions to get score mapping (1 to 10 scale)
    const getScore = (keywords) => {
      const match = sectionResults.find(sr => {
        if (!sr.sectionId) return false;
        const name = sr.sectionId.name.toLowerCase();
        return keywords.some(kw => name.includes(kw.toLowerCase()));
      });
      if (!match) {
        // Fallback: overall percentage mapped to 1-10
        return Math.max(1, Math.min(10, Math.round(result.overallScorePercentage / 10)));
      }
      return Math.max(1, Math.min(10, Math.round(match.scorePercentage / 10)));
    };

    // Helper to get color code based on 10-point score
    const getScoreColor = (score) => {
      if (score <= 3) return '#ef4444'; // Red (Low)
      if (score <= 6) return '#f59e0b'; // Orange/Yellow (Average)
      return '#10b981'; // Green (High)
    };

    // Draw real logo image with automatic vector fallback
    const drawLogo = (cx, cy, radius = 30) => {
      try {
        const logoPath = path.join(process.cwd(), 'public/ibssr-logo.png');
        const size = radius * 2;
        doc.image(logoPath, cx - radius, cy - radius, { width: size, height: size });
      } catch (err) {
        console.error("Failed to render logo image in PDF:", err);
        doc.lineWidth(1.5)
           .strokeColor('#0071e3')
           .circle(cx, cy, radius)
           .stroke();
        doc.fillColor('#0071e3')
           .fontSize(radius > 25 ? 12 : 8)
           .font(fontBold)
           .text('IBSSR', cx - (radius > 25 ? 18 : 14), cy - 4);
      }
    };

    // Draw header decoration block
    const drawHeaderDecoration = (pageNum) => {
      drawLogo(50, 45, 18);
      doc.fillColor('#0f172a')
         .fontSize(10)
         .font(fontBold)
         .text('Institute of Behavioural Social Sciences and Research', 80, 38);
      doc.fillColor('#64748b')
         .fontSize(8)
         .font(fontRegular)
         .text('IBSSR Psychological Assessment Portal', 80, 50);

      doc.lineWidth(0.5)
         .strokeColor('#e2e8f0')
         .moveTo(40, 70)
         .lineTo(555, 70)
         .stroke();
    };

    // Draw footer decoration block
    const drawFooterDecoration = (pageNum) => {
      doc.lineWidth(0.5)
         .strokeColor('#e2e8f0')
         .moveTo(40, 780)
         .lineTo(555, 780)
         .stroke();

      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font(fontRegular)
         .text('© Copyright IBSSR Private Limited. All Rights Reserved.', 40, 790);

      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font(fontBold)
         .text(`Page 0${pageNum}`, 520, 790);
    };

    // =========================================================================
    // PAGE 1: COVER PAGE — full-page template image (no exam name)
    // =========================================================================
    if (coverBuf) {
      doc.image(coverBuf, 0, 0, { width: 595, height: 842 });
      // Cover up 'Career Satu' typo in the original image with clean white patch & correct 'Career Saathi' text
      doc.fillColor('#ffffff')
         .rect(55, 260, 360, 85)
         .fill();
      doc.fillColor('#0f172a')
         .fontSize(38)
         .font(fontBold)
         .text('Career Saathi', 60, 275);
    } else {
      // Fallback drawn cover
      const stripeColors = ['#0071e3','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444'];
      stripeColors.forEach((col, idx) => {
        const sx = 420 + idx * 16;
        doc.fillColor(col).rect(sx, 0, 12, 842).fill();
      });
      drawLogo(160, 160, 80);
      doc.fillColor('#0f172a').fontSize(36).font(fontBold).text('Career Saathi', 60, 300);
      doc.fillColor('#334155').fontSize(14).font(fontRegular)
         .text('Institute of Behavioural Social Sciences and Research (IBSSR)', 60, 400, { width: 350 });
    }

    // =========================================================================
    // PAGE 2: TEST REPORT SUMMARY & CONGRATS
    // =========================================================================
    doc.addPage();
    drawHeaderDecoration(2);
    
    doc.fillColor('#0f172a')
       .fontSize(22)
       .font(fontBold)
       .text('Test Report', 40, 95);

    doc.fillColor('#64748b')
       .fontSize(12)
       .font(fontRegular)
       .text('Career Saathi Model', 40, 120);

    // Profile Box Grid (rounded borders)
    doc.lineWidth(1.5)
       .strokeColor('#10b981')
       .roundedRect(40, 150, 515, 140, 12)
       .stroke();

    // Populate metadata inside the grid
    const metaX1 = 60;
    const metaX2 = 320;
    
    doc.fillColor('#0f172a').font(fontBold).fontSize(11);
    doc.text('Name:', metaX1, 175);
    doc.text('DOB:', metaX1, 210);
    doc.text('Education:', metaX1, 245);

    doc.text('Gender:', metaX2, 175);
    doc.text('Place:', metaX2, 210);
    doc.text('Date:', metaX2, 245);

    doc.font(fontRegular).fillColor('#334155');
    doc.text(candidate.fullName, metaX1 + 75, 175);
    doc.text(candidate.dob || 'N/A', metaX1 + 75, 210);
    doc.text(candidate.education || 'N/A', metaX1 + 75, 245);

    doc.text('Male', metaX2 + 60, 175); // Standard gender fallback
    doc.text('Pune', metaX2 + 60, 210);
    doc.text(new Date(result.completedAt).toLocaleDateString(), metaX2 + 60, 245);

    // Welcome Paragraph
    doc.fillColor('#0f172a')
       .fontSize(13)
       .font(fontBold)
       .text(`Dear ${candidate.fullName},`, 40, 320);

    doc.fillColor('#334155')
       .fontSize(11)
       .font(fontRegular)
       .text(
         'Congratulations on successfully completing your assessment. Here is your Career Saathi Assessment report based on the responses that you gave during the assessment. This report will help you in clearing the vagueness that persists while choosing your career stream.\n\nThis report gives a detailed insight about your interest in different career streams, abilities and your adaptability levels. The insights gained through this report will help you in managing your career which is a lifelong process.',
         40,
         350,
         { lineGap: 6, width: 515 }
       );

    drawFooterDecoration(2);

    // =========================================================================
    // PAGE 3: KEY BENEFITS — full-page template image
    // =========================================================================
    doc.addPage();
    if (keyBenefitsBuf) {
      doc.image(keyBenefitsBuf, 0, 0, { width: 595, height: 842 });
    } else {
      // Fallback text layout
      drawHeaderDecoration(3);
      doc.fillColor('#0071e3').rect(40, 85, 4, 32).fill();
      doc.fillColor('#0f172a').fontSize(22).font(fontBold).text('Key benefits of the report.', 52, 90);
      const fallbackBenefits = [
        'Helps to gain a better understanding of your interests, abilities, and adaptability levels.',
        'Helps to identify your abilities and adaptability levels that require improvement.',
        'Provides career clusters and job role recommendations based on your abilities.',
        'Helps to attain long-term satisfaction with the right choice of career.'
      ];
      fallbackBenefits.forEach((b, i) => {
        doc.fillColor('#0071e3').circle(55, 160 + i * 145 + 10, 10).fill();
        doc.fillColor('#0f172a').fontSize(12).font(fontBold).text(b, 75, 160 + i * 145, { width: 470 });
      });
      drawLogo(297, 720, 28);
      drawFooterDecoration(3);
    }

    // =========================================================================
    // PAGE 4: CAREER STREAM INDICATOR (BAR CHART)
    // =========================================================================
    doc.addPage();
    drawHeaderDecoration(4);

    doc.fillColor('#0f172a')
       .fontSize(18)
       .font(fontBold)
       .text('Career Stream Indicator', 40, 95);

    // Stream scores
    const streams = [
      { name: 'Commerce & Mgmt', key: ['commerce', 'management', 'business'] },
      { name: 'Healthcare & Life', key: ['health', 'life science', 'medical', 'healthcare'] },
      { name: 'Creative Streams', key: ['fine arts', 'creative', 'art', 'design'] },
      { name: 'Social Sciences', key: ['social science', 'humanities'] },
      { name: 'Technical Fields', key: ['technical', 'engineering', 'computers', 'technology'] },
      { name: 'Arts & Literature', key: ['literature', 'arts', 'writing'] }
    ];

    const streamData = streams.map(s => ({
      name: s.name,
      score: getScore(s.key)
    }));

    // Draw Bar Chart Grid
    const chartY = 320;
    const chartH = 180;
    const gridLines = 5;

    // Y Axis Grids
    for (let i = 0; i <= gridLines; i++) {
      const yPos = chartY - (i / gridLines) * chartH;
      const val = (i / gridLines) * 10;
      doc.lineWidth(0.5)
         .strokeColor('#e2e8f0')
         .moveTo(60, yPos)
         .lineTo(520, yPos)
         .stroke();

      doc.fillColor('#64748b').fontSize(8).text(Math.round(val).toString(), 45, yPos - 3);
    }

    // Draw Bars
    const barWidth = 40;
    const barGap = 35;
    streamData.forEach((item, idx) => {
      const barH = (item.score / 10) * chartH;
      const xPos = 80 + idx * (barWidth + barGap);
      const yPos = chartY - barH;

      // Draw Bar Rectangle
      doc.fillColor(getScoreColor(item.score))
         .rect(xPos, yPos, barWidth, barH)
         .fill();

      // Score Value text inside bar
      doc.fillColor('#ffffff')
         .fontSize(9)
         .font(fontBold)
         .text(item.score.toString(), xPos + barWidth / 2 - 4, Math.min(yPos + 5, chartY - 12));

      // Bar Label below axis
      doc.fillColor('#334155')
         .fontSize(8)
         .font(fontBold)
         .text(item.name, xPos - 12, chartY + 10, { width: barWidth + 24, align: 'center' });
    });

    // Reference Range Legend
    doc.fillColor('#0f172a').font(fontBold).fontSize(11).text('Reference range of scores:', 40, 560);
    
    doc.fillColor('#ef4444').rect(40, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('1-3 Low', 80, 585);

    doc.fillColor('#f59e0b').rect(150, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('4-6 Average', 190, 585);

    doc.fillColor('#10b981').rect(280, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('7-10 High', 320, 585);

    // Text Summary details below
    doc.fillColor('#0f172a').font(fontBold).fontSize(12).text('Dominant Streams Summary:', 40, 630);
    
    // Sort and get highest score
    const highestStream = [...streamData].sort((a,b) => b.score - a.score)[0];
    doc.fillColor('#334155')
       .font(fontRegular)
       .fontSize(10)
       .text(
         `Your dominant interest lies in "${highestStream.name}" (Score: ${highestStream.score}/10). This indicates that you exhibit a very high affinity towards opportunities in this field. We recommend exploring career clusters, courses, and internship options mapped to this domain for long-term career satisfaction.`,
         40,
         655,
         { width: 515, lineGap: 4 }
       );

    drawFooterDecoration(4);

    // =========================================================================
    // PAGE 5: COGNITIVE ABILITY ASSESSMENT (BAR CHART)
    // =========================================================================
    doc.addPage();
    drawHeaderDecoration(5);

    doc.fillColor('#0f172a')
       .fontSize(18)
       .font(fontBold)
       .text('Cognitive Ability Assessment', 40, 95);

    const cognitives = [
      { name: 'Abstract', key: ['abstract', 'reasoning'] },
      { name: 'Mathematical', key: ['math', 'numerical', 'arithmetic'] },
      { name: 'Verbal Eng', key: ['verbal', 'english'] },
      { name: 'Hindi Lang', key: ['hindi', 'bhanshik', 'भाषा'] },
      { name: 'Visualization', key: ['visual', 'spatial'] },
      { name: 'Speed & Acc', key: ['speed', 'accuracy'] },
      { name: 'Mechanical', key: ['mechanical'] }
    ];

    const cogData = cognitives.map(c => ({
      name: c.name,
      score: getScore(c.key)
    }));

    // Draw Bar Chart Grid
    const cogChartY = 320;
    const cogChartH = 180;

    for (let i = 0; i <= gridLines; i++) {
      const yPos = cogChartY - (i / gridLines) * cogChartH;
      doc.lineWidth(0.5)
         .strokeColor('#e2e8f0')
         .moveTo(60, yPos)
         .lineTo(520, yPos)
         .stroke();

      doc.fillColor('#64748b').fontSize(8).text(Math.round((i / gridLines) * 10).toString(), 45, yPos - 3);
    }

    // Draw Bars (7 bars)
    const cogBarW = 35;
    const cogBarG = 28;
    cogData.forEach((item, idx) => {
      const barH = (item.score / 10) * cogChartH;
      const xPos = 70 + idx * (cogBarW + cogBarG);
      const yPos = cogChartY - barH;

      doc.fillColor(getScoreColor(item.score))
         .rect(xPos, yPos, cogBarW, barH)
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(9)
         .font(fontBold)
         .text(item.score.toString(), xPos + cogBarW / 2 - 4, Math.min(yPos + 5, cogChartY - 12));

      doc.fillColor('#334155')
         .fontSize(7.5)
         .font(fontBold)
         .text(item.name, xPos - 12, cogChartY + 10, { width: cogBarW + 24, align: 'center' });
    });

    // Reference Range Legend
    doc.fillColor('#0f172a').font(fontBold).fontSize(11).text('Reference range of scores:', 40, 560);
    
    doc.fillColor('#ef4444').rect(40, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('1-3 Low', 80, 585);

    doc.fillColor('#f59e0b').rect(150, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('4-6 Average', 190, 585);

    doc.fillColor('#10b981').rect(280, 585, 30, 8).fill();
    doc.fillColor('#334155').font(fontRegular).fontSize(9).text('7-10 High', 320, 585);

    // Text Summary details below
    doc.fillColor('#0f172a').font(fontBold).fontSize(12).text('Dominant Abilities Summary:', 40, 630);
    const highestCog = [...cogData].sort((a,b) => b.score - a.score)[0];
    doc.fillColor('#334155')
       .font(fontRegular)
       .fontSize(10)
       .text(
         `Your highest cognitive ability score is in "${highestCog.name}" (Score: ${highestCog.score}/10). This indicates a strong capability for complex problem solving, processing, and visual-spatial mapping associated with this capability domain.`,
         40,
         655,
         { width: 515, lineGap: 4 }
       );

    drawFooterDecoration(5);

    // =========================================================================
    // PAGE 6: ADAPTABILITY INVENTORY
    // =========================================================================
    doc.addPage();
    drawHeaderDecoration(6);

    doc.fillColor('#0f172a')
       .fontSize(18)
       .font(fontBold)
       .text('Student Adaptability Inventory', 40, 95);

    const adaptabilities = [
      { name: 'Home', score: getScore(['home']), desc: 'Your responses indicate a healthy relationship and support structure at home. You tend to feel safe, happy, and receive strong mental validation from family members.' },
      { name: 'Health', score: getScore(['health']), desc: 'Your responses indicate that you adapt well to physical requirements, exhibit good wellness, and manage recurring climate/illness impacts successfully.' },
      { name: 'Social', score: getScore(['social']), desc: 'Your responses reflect a fairly active social profile. You show good empathy, easily make friends at social events, and adapt comfortably to groups.' },
      { name: 'Emotional', score: getScore(['emotional']), desc: 'Your responses measure emotional self-regulation, mindfulness, and the ability to process stress, anxiety, or nervousness without feeling insecure.' }
    ];

    adaptabilities.forEach((item, idx) => {
      const blockY = 140 + idx * 140;

      // Header row
      doc.fillColor('#0f172a')
         .fontSize(13)
         .font(fontBold)
         .text(`${item.name} Adaptability`, 40, blockY);

      // Score rating
      doc.fillColor(getScoreColor(item.score))
         .fontSize(11)
         .font(fontBold)
         .text(`Score: ${item.score}/10`, 480, blockY);

      // Progress bar
      doc.fillColor('#e2e8f0')
         .rect(40, blockY + 20, 515, 8)
         .fill();

      doc.fillColor(getScoreColor(item.score))
         .rect(40, blockY + 20, (item.score / 10) * 515, 8)
         .fill();

      // Description text
      doc.fillColor('#334155')
         .fontSize(10)
         .font(fontRegular)
         .text(item.desc, 40, blockY + 40, { width: 515, lineGap: 4 });
    });

    drawFooterDecoration(6);

    // =========================================================================
    // PAGE 7: COUNSELLOR NOTES, RECOMMENDS & DISCLAIMERS
    // =========================================================================
    doc.addPage();
    drawHeaderDecoration(7);

    doc.fillColor('#0f172a')
       .fontSize(18)
       .font(fontBold)
       .text("Counsellor's Use", 40, 95);

    // Notes boxes (split boxes)
    doc.lineWidth(1)
       .strokeColor('#cbd5e1')
       .roundedRect(40, 130, 245, 220, 8)
       .roundedRect(310, 130, 245, 220, 8)
       .stroke();

    // Notes headers
    doc.fillColor('#0f172a').font(fontBold).fontSize(11);
    doc.text("Counsellor's Notes:", 55, 145);
    doc.text("Suggestions & Guidance:", 325, 145);

    // Signature details grid below
    const sigY = 410;
    doc.fillColor('#334155').font(fontBold).fontSize(10);
    doc.text('Date: ________________________', 40, sigY);
    doc.text('Place: _______________________', 40, sigY + 40);

    doc.text('Counsellor Name & Signature:', 310, sigY);
    doc.text('Counsellor Code: ______________', 310, sigY + 40);

    // Recommendations list
    doc.fillColor('#0f172a').fontSize(13).font(fontBold).text('Key Recommendations:', 40, 520);
    const recommends = [
      'Generally, every individual performs differently across various capabilities. The abilities in your report indicate that you have performed satisfactorily.',
      'These capabilities can provide highly successful contributions to your future career and related decision-making processes.',
      'We recommend standard educational mapping counseling to select secondary/higher streams.'
    ];
    recommends.forEach((r, idx) => {
      doc.fillColor('#0071e3').font(fontBold).text('•', 45, 550 + idx * 40);
      doc.fillColor('#334155').font(fontRegular).fontSize(9.5).text(r, 60, 550 + idx * 40, { width: 490, lineGap: 3 });
    });

    // Disclaimer footer
    doc.fillColor('#0f172a')
       .fontSize(10)
       .font(fontBold)
       .text('Disclaimer:', 40, 690);

    doc.fillColor('#64748b')
       .fontSize(8.5)
       .font(fontRegular)
       .text(
         'Please note that human behavior and motivation levels change with circumstances and life experiences, therefore the results captured in this report are purely based on your responses provided at a particular time frame. We recommend using this report as a guideline, and we also recommend retaking the test in case you feel your circumstances have changed since you took this test.',
         40,
         710,
         { width: 515, lineGap: 3 }
       );

    drawFooterDecoration(7);

    // =========================================================================
    // LAST PAGE: IBSSR BACK COVER — full-page template image
    // =========================================================================
    doc.addPage();
    if (backCoverBuf) {
      doc.image(backCoverBuf, 0, 0, { width: 595, height: 842 });
    } else {
      // Fallback drawn back cover
      const bcColors = ['#0071e3','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444'];
      bcColors.forEach((col, idx) => {
        const sx = 20 + idx * 16;
        doc.fillColor(col).rect(sx, 0, 12, 842).fill();
      });
      drawLogo(297, 380, 90);
      doc.fillColor('#0f172a').fontSize(22).font(fontBold)
         .text('Institute of Behavioural\nSocial Sciences and\nResearch (IBSSR)', 140, 490, { align: 'center', width: 315, lineGap: 6 });
    }

    // Finish PDF document
    doc.end();
  });
}
