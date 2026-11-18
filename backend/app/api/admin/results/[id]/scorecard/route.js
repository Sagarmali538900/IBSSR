import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { ids } from '@/lib/schemas';
import { ExamResult, SectionResult, ExamSession, Section, Question, Option, CandidateAnswer } from '@/models';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid result ID.' }, { status: 400 });
  const token = request.cookies.get('session')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const result = await ExamResult.findById(id).populate({ path: 'sessionId', populate: [{ path: 'candidateId' }, { path: 'examId' }, { path: 'assignmentId' }] });
  if (!result?.sessionId) return NextResponse.json({ message: 'Result not found' }, { status: 404 });
  const examSession = result.sessionId;
  const candidate = examSession.candidateId;
  const exam = examSession.examId;
  const assignment = examSession.assignmentId;
  if (!user.isSuperuser && assignment?.createdBy?.toString() !== user.userId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const sectionResults = await SectionResult.find({ examResultId: id }).populate('sectionId');
  const candidateAnswers = await CandidateAnswer.find({ sessionId: examSession._id }).populate('selectedOptionIds');
  const sections = exam ? await Section.find({ examId: exam._id }).sort({ order: 1 }) : [];
  const questions = exam ? await Question.find({ sectionId: { $in: sections.map((item) => item._id) } }).sort({ order: 1 }) : [];
  const options = exam ? await Option.find({ questionId: { $in: questions.map((item) => item._id) } }) : [];
  return NextResponse.json({
    result: { overallScorePercentage: result.overallScorePercentage, completedAt: result.completedAt },
    candidate: { fullName: candidate?.fullName, email: candidate?.email, mobileNumber: candidate?.mobileNumber },
    exam: exam ? { title: exam.title } : null,
    assignment: assignment ? { examCode: assignment.examCode } : null,
    sectionResults: sectionResults.map((item) => ({ id: item._id.toString(), sectionId: { name: item.sectionId?.name || 'Deleted Section' }, scorePercentage: item.scorePercentage })),
    sections: sections.map((item) => ({ _id: item._id.toString(), name: item.name })),
    questions: questions.map((item) => ({ _id: item._id.toString(), sectionId: item.sectionId.toString(), text: item.text, image: item.image || null, questionType: item.questionType })),
    options: options.map((item) => ({ _id: item._id.toString(), questionId: item.questionId.toString(), text: item.text, image: item.image || null, score: item.score })),
    answers: candidateAnswers.map((item) => ({ questionId: item.questionId.toString(), selectedOptionIds: item.selectedOptionIds.map((option) => ({ _id: option._id.toString(), score: option.score })) })),
  });
}
