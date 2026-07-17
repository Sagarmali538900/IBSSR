import { notFound, redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import { ExamSession, Section, Question, Option, CandidateAnswer } from '@/lib/models';
import { calculateAndFinalizeResults, sendCandidateReportEmail } from '@/lib/scoring';
import ExamRunClient from './ExamRunClient';

export default async function ExamRunPage({ params }) {
  const { sessionId } = await params;

  await dbConnect();

  const session = await ExamSession.findById(sessionId)
    .populate('examId')
    .populate('candidateId');

  if (!session) {
    notFound();
  }

  if (session.status === 'completed') {
    redirect(`/candidate/completed/${sessionId}`);
  }

  // If no section active, set to first section
  if (!session.currentSectionId) {
    const firstSec = await Section.findOne({ examId: session.examId._id }).sort({ order: 1 });
    if (!firstSec) {
      // Empty exam!
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
      redirect(`/candidate/completed/${sessionId}`);
    }
    session.currentSectionId = firstSec._id;
    session.sectionStartedAt = new Date();
    await session.save();
  }

  const section = await Section.findById(session.currentSectionId);
  if (!section) {
    notFound();
  }

  // Calculate elapsed time & check expiry
  const elapsedSeconds = (new Date().getTime() - new Date(session.sectionStartedAt).getTime()) / 1000;
  const totalDurationSeconds = section.durationMinutes * 60 + section.durationSeconds;
  const timeLeft = Math.max(0, Math.floor(totalDurationSeconds - elapsedSeconds));

  if (timeLeft <= 0) {
    // Time expired! Auto advance section
    const sections = await Section.find({ examId: session.examId._id }).sort({ order: 1 });
    const sectionIds = sections.map(s => s._id.toString());
    const currentIdx = sectionIds.indexOf(session.currentSectionId.toString());

    if (currentIdx !== -1 && currentIdx + 1 < sections.length) {
      session.currentSectionId = sections[currentIdx + 1]._id;
      session.sectionStartedAt = new Date();
      await session.save();
      redirect(`/candidate/exam-run/${sessionId}`);
    } else {
      session.status = 'completed';
      session.completedAt = new Date();
      session.currentSectionId = null;
      await session.save();

      const result = await calculateAndFinalizeResults(sessionId);
      await sendCandidateReportEmail(sessionId, result);
      
      redirect(`/candidate/completed/${sessionId}`);
    }
  }

  // Load questions and options
  const questions = await Question.find({ sectionId: section._id }).sort({ order: 1 });
  const questionIds = questions.map(q => q._id);
  const options = await Option.find({ questionId: { $in: questionIds } });

  // Map option choice documents
  const serializedOptions = options.map(opt => ({
    id: opt._id.toString(),
    questionId: opt.questionId.toString(),
    text: opt.text,
    image: opt.image || null,
    score: opt.score
  }));

  const serializedQuestions = questions.map(q => ({
    id: q._id.toString(),
    text: q.text,
    image: q.image || null,
    questionType: q.questionType,
    order: q.order,
    options: serializedOptions.filter(opt => opt.questionId === q._id.toString())
  }));

  // Fetch candidate answers in this section
  const candidateAnswers = await CandidateAnswer.find({
    sessionId,
    questionId: { $in: questionIds }
  });

  const savedAnswers = {};
  candidateAnswers.forEach((ans) => {
    savedAnswers[ans.questionId.toString()] = ans.selectedOptionIds.map(id => id.toString());
  });

  // Calculate side progression data
  const allSections = await Section.find({ examId: session.examId._id }).sort({ order: 1 });
  const allQuestions = await Question.find({ sectionId: { $in: allSections.map(s => s._id) } });
  
  const answeredQIds = await CandidateAnswer.find({ sessionId }).distinct('questionId');
  const answeredQSet = new Set(answeredQIds.map(id => id.toString()));

  const sectionsData = [];
  let currentSecFound = false;

  allSections.forEach((sec) => {
    const secQuestions = allQuestions.filter(q => q.sectionId.toString() === sec._id.toString());
    const totalQ = secQuestions.length;
    const answeredQ = secQuestions.filter(q => answeredQSet.has(q._id.toString())).length;

    let status = 'upcoming';
    if (sec._id.toString() === section._id.toString()) {
      status = 'active';
      currentSecFound = true;
    } else if (!currentSecFound) {
      status = 'completed';
    }

    sectionsData.push({
      id: sec._id.toString(),
      name: sec.name,
      totalQuestions: totalQ,
      answeredQuestions: answeredQ,
      remainingQuestions: totalQ - answeredQ,
      status
    });
  });

  return (
    <ExamRunClient
      sessionId={sessionId}
      section={{
        id: section._id.toString(),
        name: section.name,
        description: section.description || '',
        totalDurationSeconds
      }}
      questions={serializedQuestions}
      initialTimeLeft={timeLeft}
      initialSavedAnswers={savedAnswers}
      sectionsData={sectionsData}
    />
  );
}
