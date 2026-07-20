import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ExamAssignment, Exam } from '@/lib/models';
import { sendEmail } from '@/lib/mail';

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

        // Send assignment email with date and time
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const subject = `Psychological Assessment Assigned: ${exam.title}`;
        const textBody = `Hello,\n\n` +
          `You have been assigned to take the psychological assessment '${exam.title}' on the IBSSR Portal.\n\n` +
          `Assessment Details:\n` +
          `- Exam: ${exam.title}\n` +
          `- Date & Time Assigned: ${formattedDate} (IST)\n` +
          `- Your Access Code: ${finalCode}\n\n` +
          `Instructions to start the test:\n` +
          `1. Go to the examination portal: https://ibssr.vercel.app\n` +
          `2. Enter your unique Access Code: ${finalCode}\n` +
          `3. Complete the registration form and start the test.\n\n` +
          `Please make sure you take the assessment in a quiet environment.\n\n` +
          `Best regards,\n` +
          `IBSSR Examination Team`;

        try {
          await sendEmail({
            to: email,
            subject,
            text: textBody
          });
        } catch (err) {
          console.error(`Failed to send assignment notification to ${email}:`, err.message);
        }

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
