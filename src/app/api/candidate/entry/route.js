import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ExamAssignment, Candidate, ExamSession } from '@/lib/models';

export async function POST(request) {
  try {
    await dbConnect();
    const { step, examCode, fullName, email, mobileNumber } = await request.json();

    if (!examCode) {
      return NextResponse.json({ message: 'Exam access code is required.' }, { status: 400 });
    }

    const codeUpper = examCode.trim().toUpperCase();

    // STEP 1: Validate access code existence
    if (Number(step) === 1) {
      const assignments = await ExamAssignment.find({ examCode: codeUpper }).populate('examId');
      if (assignments.length === 0) {
        return NextResponse.json({ message: 'Invalid Exam Access Code. Please verify and try again.' }, { status: 400 });
      }

      const examTitle = assignments[0].examId?.title || 'Psychological Assessment';
      return NextResponse.json({ success: true, examTitle });
    }

    // STEP 2: Candidate Registration & Authorization check
    if (Number(step) === 2) {
      if (!fullName || !email || !mobileNumber) {
        return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
      }

      const emailLower = email.trim().toLowerCase();
      const nameTrimmed = fullName.trim();
      const mobileTrimmed = mobileNumber.trim();

      // Check if email is assigned to this code
      const assignment = await ExamAssignment.findOne({ examCode: codeUpper, assignedEmail: emailLower }).populate('examId');
      if (!assignment) {
        return NextResponse.json({ message: 'This email is not authorized for this Exam Access Code. Please contact your Administrator.' }, { status: 403 });
      }

      // Fetch or create Candidate
      let candidate = await Candidate.findOne({ email: emailLower });
      if (!candidate) {
        candidate = await Candidate.create({
          fullName: nameTrimmed,
          email: emailLower,
          mobileNumber: mobileTrimmed
        });
      }

      // Check for existing session on this code
      const existingSession = await ExamSession.findOne({
        candidateId: candidate._id,
        examId: assignment.examId._id,
        assignmentId: assignment._id
      });

      if (existingSession) {
        if (existingSession.status === 'completed') {
          return NextResponse.json({ message: 'You have already completed this exam. Re-taking is not allowed.' }, { status: 403 });
        } else {
          // Resume existing in_progress session
          return NextResponse.json({ success: true, sessionId: existingSession._id.toString(), resumed: true });
        }
      }

      // Create new session
      const newSession = await ExamSession.create({
        candidateId: candidate._id,
        assignmentId: assignment._id,
        examId: assignment.examId._id,
        status: 'in_progress'
      });

      return NextResponse.json({ success: true, sessionId: newSession._id.toString(), resumed: false });
    }

    return NextResponse.json({ message: 'Invalid step payload.' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
