import {
  ExamResult,
  SectionResult,
  SentEmailLog,
  Section,
  Question,
  Option,
  ExamSession,
  CandidateAnswer
} from './models';
import { sendEmail } from './mail.js';
import { getResultsEmail } from './emailTemplates.js';
import { generatePdfReport } from './pdfGenerator.js';

export async function calculateAndFinalizeResults(sessionId) {
  // Prevent duplicate calculations
  const existingResult = await ExamResult.findOne({ sessionId });
  if (existingResult) {
    return existingResult;
  }

  const session = await ExamSession.findById(sessionId).populate('examId');
  if (!session || !session.examId) throw new Error('Exam session not found');

  const sections = await Section.find({ examId: session.examId._id }).sort({ order: 1 }).lean();
  const sectionIds = sections.map(s => s._id);

  // Batch fetch all questions & candidate answers in parallel
  const [questions, candidateAnswers] = await Promise.all([
    Question.find({ sectionId: { $in: sectionIds } }).lean(),
    CandidateAnswer.find({ sessionId }).populate('selectedOptionIds').lean()
  ]);

  const questionIds = questions.map(q => q._id);
  const options = await Option.find({ questionId: { $in: questionIds } }).lean();

  // Index questions by sectionId
  const questionsBySection = new Map();
  questions.forEach(q => {
    const sId = q.sectionId.toString();
    if (!questionsBySection.has(sId)) questionsBySection.set(sId, []);
    questionsBySection.get(sId).push(q);
  });

  // Index options by questionId
  const optionsByQuestion = new Map();
  options.forEach(opt => {
    const qId = opt.questionId.toString();
    if (!optionsByQuestion.has(qId)) optionsByQuestion.set(qId, []);
    optionsByQuestion.get(qId).push(opt);
  });

  // Index candidate answers by questionId
  const answerByQuestion = new Map();
  candidateAnswers.forEach(ans => {
    answerByQuestion.set(ans.questionId.toString(), ans);
  });

  let totalEarnedScore = 0.0;
  let totalMaxScore = 0.0;
  const sectionScores = [];

  for (const section of sections) {
    const secQuestions = questionsBySection.get(section._id.toString()) || [];
    let sectionEarned = 0.0;
    let sectionMax = 0.0;

    for (const question of secQuestions) {
      const qOptions = optionsByQuestion.get(question._id.toString()) || [];
      const qMax = qOptions.reduce((sum, opt) => sum + (opt.score > 0 ? opt.score : 0), 0);
      sectionMax += qMax;

      const ans = answerByQuestion.get(question._id.toString());
      if (ans && ans.selectedOptionIds && ans.selectedOptionIds.length > 0) {
        if (question.questionType === 'single_select') {
          const firstOpt = ans.selectedOptionIds[0];
          sectionEarned += (firstOpt && typeof firstOpt.score === 'number') ? firstOpt.score : 0;
        } else {
          const score = ans.selectedOptionIds.reduce((sum, opt) => sum + (opt && typeof opt.score === 'number' ? opt.score : 0), 0);
          sectionEarned += score;
        }
      }
    }

    sectionScores.push({ section, earned: sectionEarned, max: sectionMax });
    totalEarnedScore += sectionEarned;
    totalMaxScore += sectionMax;
  }

  // Calculate overall percentage
  let overallPercentage = 0.0;
  if (totalMaxScore > 0) {
    overallPercentage = Math.round((totalEarnedScore / totalMaxScore) * 10000) / 100;
  }

  // Create result
  const result = await ExamResult.create({
    sessionId,
    overallScorePercentage: overallPercentage,
    completedAt: new Date()
  });

  // Create section results in 1 batch insertMany
  const sectionResultDocs = sectionScores.map(item => {
    let secPercentage = 0.0;
    if (item.max > 0) {
      secPercentage = Math.round((item.earned / item.max) * 10000) / 100;
    }
    return {
      examResultId: result._id,
      sectionId: item.section._id,
      scorePercentage: secPercentage
    };
  });

  if (sectionResultDocs.length > 0) {
    await SectionResult.insertMany(sectionResultDocs);
  }

  return result;
}

export async function sendCandidateReportEmail(sessionId, resultObj = null) {
  const session = await ExamSession.findById(sessionId)
    .populate('candidateId')
    .populate('examId');
  
  const candidate = session.candidateId;
  const exam = session.examId;
  
  const result = resultObj || await ExamResult.findOne({ sessionId });
  if (!result) return;

  const sectionResults = await SectionResult.find({ examResultId: result._id }).populate('sectionId');

  const subject = `Your results for: ${exam.title}`;
  
  const { html, text } = getResultsEmail(
    candidate.fullName,
    exam.title,
    result.overallScorePercentage,
    sectionResults
  );

  // Generate the PDF report attachment buffer
  let pdfBuffer = null;
  try {
    pdfBuffer = await generatePdfReport(sessionId);
  } catch (pdfErr) {
    console.error('Failed to generate PDF report buffer for email attachment:', pdfErr);
  }

  // Send SMTP email
  let status = 'Sent';
  try {
    const emailPayload = {
      to: candidate.email,
      subject,
      text,
      html
    };

    if (pdfBuffer) {
      const filename = `IBSSR_Assessment_Report_${candidate.fullName.replace(/\s+/g, '_')}.pdf`;
      emailPayload.attachments = [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];
    }

    const info = await sendEmail(emailPayload);
    status = info.status; // 'Sent' or 'Mocked'
  } catch (err) {
    status = 'Failed';
    console.error('Failed to send candidate report email via SMTP:', err);
  }

  // Create SentEmailLog
  await SentEmailLog.create({
    recipientEmail: candidate.email,
    subject,
    body: text,
    sentAt: new Date(),
    status
  });
}
