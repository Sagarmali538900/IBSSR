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

export async function calculateAndFinalizeResults(sessionId) {
  // Prevent duplicate calculations
  const existingResult = await ExamResult.findOne({ sessionId });
  if (existingResult) {
    return existingResult;
  }

  const session = await ExamSession.findById(sessionId).populate('examId');
  const sections = await Section.find({ examId: session.examId._id }).sort({ order: 1 });
  
  let totalEarnedScore = 0.0;
  let totalMaxScore = 0.0;
  
  const sectionScores = []; // Array of { section, earned, max }

  for (const section of sections) {
    const questions = await Question.find({ sectionId: section._id });
    let sectionEarned = 0.0;
    let sectionMax = 0.0;

    for (const question of questions) {
      // Find max possible score for this question (sum of option scores > 0)
      const options = await Option.find({ questionId: question._id });
      const qMax = options.reduce((sum, opt) => sum + (opt.score > 0 ? opt.score : 0), 0);
      sectionMax += qMax;

      // Get candidate answers
      const ans = await CandidateAnswer.findOne({ sessionId, questionId: question._id })
        .populate('selectedOptionIds');
      
      if (ans && ans.selectedOptionIds.length > 0) {
        if (question.questionType === 'single_select') {
          // Single select choice
          sectionEarned += ans.selectedOptionIds[0].score;
        } else {
          // Multi select: sum choice weights
          const score = ans.selectedOptionIds.reduce((sum, opt) => sum + opt.score, 0);
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

  // Create section results
  for (const item of sectionScores) {
    let secPercentage = 0.0;
    if (item.max > 0) {
      secPercentage = Math.round((item.earned / item.max) * 10000) / 100;
    }
    await SectionResult.create({
      examResultId: result._id,
      sectionId: item.section._id,
      scorePercentage: secPercentage
    });
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

  const subject = `Your Psychological Assessment Result: ${exam.title}`;
  
  let body = `Hello ${candidate.fullName},\n\n`;
  body += `Thank you for completing the '${exam.title}' on our portal.\n\n`;
  body += `--- ASSESSMENT RESULTS ---\n`;
  body += `Overall Score: ${result.overallScorePercentage}%\n\n`;
  body += `Section-wise breakdown:\n`;
  
  for (const secRes of sectionResults) {
    body += `- ${secRes.sectionId.name}: ${secRes.scorePercentage}%\n`;
  }
  
  body += `\nThank you,\nIBSSR Examination Team\n`;

  // Send SMTP email
  let status = 'Sent';
  try {
    const info = await sendEmail({
      to: candidate.email,
      subject,
      text: body
    });
    status = info.status; // 'Sent' or 'Mocked'
  } catch (err) {
    status = 'Failed';
    console.error('Failed to send candidate report email via SMTP:', err);
  }

  // Create SentEmailLog
  await SentEmailLog.create({
    recipientEmail: candidate.email,
    subject,
    body,
    sentAt: new Date(),
    status
  });
}
