import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ExamAssignment, Exam } from '@/lib/models';

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { examId, examCode, emailsText } = await request.json();

    if (!examId || !emailsText) {
      return NextResponse.json({ message: 'Exam and emails are required.' }, { status: 400 });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Role check: Franchise can only assign their own exams
    if (!session.isSuperuser && exam.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Process code
    let finalCode = examCode ? examCode.trim().toUpperCase() : '';
    if (!finalCode) {
      // Generate random 8-character code
      const hex = Math.random().toString(36).substring(2, 10).toUpperCase();
      finalCode = `EXAM-${hex}`;
    }

    // Parse emails (split by comma or newline)
    const rawEmails = emailsText.replace(/,/g, '\n').split('\n');
    const emails = [];
    for (let email of rawEmails) {
      email = email.trim().toLowerCase();
      if (email) {
        if (!email.includes('@')) {
          return NextResponse.json({ message: `Invalid email address format: '${email}'` }, { status: 400 });
        }
        emails.push(email);
      }
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: 'Please enter at least one valid email address.' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const email of emails) {
      const existing = await ExamAssignment.findOne({ examCode: finalCode, assignedEmail: email });
      if (!existing) {
        await ExamAssignment.create({
          examId,
          examCode: finalCode,
          assignedEmail: email,
          createdBy: session.userId
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${createdCount} email(s) to code '${finalCode}'${skippedCount > 0 ? ` (${skippedCount} already existed)` : ''}.`
    });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
