import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { ExamAssignment, Exam } from '@/models';
import { sendEmail } from '@/mail';
import { getAssignmentEmail } from '@/emailTemplates';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function GET(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const query = session.isSuperuser ? {} : { createdBy: session.userId };
    const [assignments, exams] = await Promise.all([
      ExamAssignment.find(query).populate('examId', 'title').populate('createdBy', 'username').sort({ createdAt: -1 }),
      Exam.find(session.isSuperuser ? {} : { createdBy: session.userId }).sort({ title: 1 }),
    ]);
    return NextResponse.json({
      assignments: assignments.map((item) => ({ id: item._id.toString(), examId: item.examId?._id?.toString() || '', examTitle: item.examId?.title || 'Deleted Exam', examCode: item.examCode, assignedEmail: item.assignedEmail, createdByName: item.createdBy?.username || 'System', createdAt: item.createdAt.toISOString() })),
      exams: exams.map((exam) => ({ id: exam._id.toString(), title: exam.title })),
    });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const validation = await readValidatedJson(request, schemas.createAssignments);
    if (!validation.success) return validation.response;
    const { examId, examCode, emailsText } = validation.data;

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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
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

        const subject = `Invitation: ${exam.title} Assessment`;
        const { html, text } = getAssignmentEmail(exam.title, formattedDate, finalCode);

        try {
          await sendEmail({
            to: email,
            subject,
            text,
            html
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
