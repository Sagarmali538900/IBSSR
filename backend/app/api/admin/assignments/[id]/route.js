import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { ExamAssignment } from '@/models';
import { readValidatedJson } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assignment ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const assignment = await ExamAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found.' }, { status: 404 });
    }

    // Role check: Franchise can only edit their own assignments
    if (!session.isSuperuser && assignment.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const validation = await readValidatedJson(request, schemas.updateAssignment);
    if (!validation.success) return validation.response;
    const { examCode, assignedEmail } = validation.data;

    const finalCode = examCode.trim().toUpperCase();
    const finalEmail = assignedEmail.trim().toLowerCase();

    // Check duplicate conflict
    const conflict = await ExamAssignment.findOne({
      examCode: finalCode,
      assignedEmail: finalEmail,
      _id: { $ne: id }
    });

    if (conflict) {
      return NextResponse.json({ message: 'Assignment for this code and email already exists.' }, { status: 400 });
    }

    assignment.examCode = finalCode;
    assignment.assignedEmail = finalEmail;
    await assignment.save();

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid assignment ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const assignment = await ExamAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found.' }, { status: 404 });
    }

    // Role Check
    if (!session.isSuperuser && assignment.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await ExamAssignment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
