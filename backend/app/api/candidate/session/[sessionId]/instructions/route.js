import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { ExamSession, Section } from '@/models';
import { ids } from '@/lib/schemas';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  if (!ids.objectId.safeParse(sessionId).success) return NextResponse.json({ message: 'Invalid session ID.' }, { status: 400 });
  await dbConnect();
  const session = await ExamSession.findById(sessionId).populate('candidateId examId');
  if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  return NextResponse.json({ status: session.status, candidate: { fullName: session.candidateId?.fullName }, exam: { title: session.examId?.title, description: session.examId?.description || '' } });
}

export async function POST(_request, { params }) {
  const { sessionId } = await params;
  if (!ids.objectId.safeParse(sessionId).success) return NextResponse.json({ message: 'Invalid session ID.' }, { status: 400 });
  await dbConnect();
  const session = await ExamSession.findById(sessionId);
  if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  if (!session.currentSectionId) {
    const firstSection = await Section.findOne({ examId: session.examId }).sort({ order: 1 });
    if (firstSection) session.currentSectionId = firstSection._id;
  }
  session.sectionStartedAt = new Date();
  await session.save();
  return NextResponse.json({ success: true });
}
