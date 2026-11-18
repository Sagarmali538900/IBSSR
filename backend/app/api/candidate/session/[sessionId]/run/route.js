import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { ExamSession, Section, Question, Option, CandidateAnswer } from '@/models';
import { calculateAndFinalizeResults, sendCandidateReportEmail } from '@/scoring';
import { ids } from '@/lib/schemas';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  if (!ids.objectId.safeParse(sessionId).success) return NextResponse.json({ message: 'Invalid session ID.' }, { status: 400 });
  await dbConnect();
  const session = await ExamSession.findById(sessionId).populate('examId candidateId');
  if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  if (session.status === 'completed') return NextResponse.json({ redirect: 'completed' });

  if (!session.currentSectionId) {
    const first = await Section.findOne({ examId: session.examId._id }).sort({ order: 1 });
    if (!first) {
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
      return NextResponse.json({ redirect: 'completed' });
    }
    session.currentSectionId = first._id;
    session.sectionStartedAt = new Date();
    await session.save();
  }

  const section = await Section.findById(session.currentSectionId);
  if (!section) return NextResponse.json({ message: 'Section not found' }, { status: 404 });
  const duration = section.durationMinutes * 60 + section.durationSeconds;
  const timeLeft = Math.max(0, Math.floor(duration - (Date.now() - new Date(session.sectionStartedAt).getTime()) / 1000));
  if (timeLeft <= 0) {
    const sections = await Section.find({ examId: session.examId._id }).sort({ order: 1 });
    const index = sections.findIndex((item) => item._id.toString() === session.currentSectionId.toString());
    if (index >= 0 && index + 1 < sections.length) {
      session.currentSectionId = sections[index + 1]._id;
      session.sectionStartedAt = new Date();
      await session.save();
      return NextResponse.json({ redirect: 'run' });
    }
    session.status = 'completed';
    session.completedAt = new Date();
    session.currentSectionId = null;
    await session.save();
    const result = await calculateAndFinalizeResults(sessionId);
    sendCandidateReportEmail(sessionId, result).catch((error) => console.error('Background report email error:', error));
    return NextResponse.json({ redirect: 'completed' });
  }

  const [questions, allSections, answeredIds, candidateAnswers] = await Promise.all([
    Question.find({ sectionId: section._id }).sort({ order: 1 }),
    Section.find({ examId: session.examId._id }).sort({ order: 1 }),
    CandidateAnswer.find({ sessionId }).distinct('questionId'),
    CandidateAnswer.find({ sessionId }),
  ]);
  const questionIds = questions.map((item) => item._id);
  const options = await Option.find({ questionId: { $in: questionIds } });
  const allQuestions = await Question.find({ sectionId: { $in: allSections.map((item) => item._id) } });
  const answered = new Set(answeredIds.map((id) => id.toString()));
  const currentIndex = allSections.findIndex((item) => item._id.toString() === section._id.toString());
  const sectionsData = allSections.map((item, index) => {
    const members = allQuestions.filter((question) => question.sectionId.toString() === item._id.toString());
    const answeredQuestions = members.filter((question) => answered.has(question._id.toString())).length;
    return { id: item._id.toString(), name: item.name, totalQuestions: members.length, answeredQuestions, remainingQuestions: members.length - answeredQuestions, status: index === currentIndex ? 'active' : index < currentIndex ? 'completed' : 'upcoming' };
  });
  const optionsData = options.map((item) => ({ id: item._id.toString(), questionId: item.questionId.toString(), text: item.text, image: item.image || null, score: item.score }));
  const savedAnswers = Object.fromEntries(candidateAnswers.filter((item) => questionIds.some((id) => id.toString() === item.questionId.toString())).map((item) => [item.questionId.toString(), item.selectedOptionIds.map((id) => id.toString())]));

  return NextResponse.json({
    sessionId,
    section: { id: section._id.toString(), name: section.name, description: section.description || '', totalDurationSeconds: duration },
    questions: questions.map((item) => ({ id: item._id.toString(), text: item.text, image: item.image || null, questionType: item.questionType, order: item.order, options: optionsData.filter((option) => option.questionId === item._id.toString()) })),
    initialTimeLeft: timeLeft,
    initialSavedAnswers: savedAnswers,
    sectionsData,
  });
}
