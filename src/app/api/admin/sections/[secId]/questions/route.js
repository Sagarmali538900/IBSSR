import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Section, Question, Option } from '@/lib/models';
import { uploadToVercelBlob } from '@/lib/vercelBlob';

async function saveUploadedFile(file) {
  return await uploadToVercelBlob(file);
}

export async function POST(request, { params }) {
  try {
    const { secId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const section = await Section.findById(secId).populate('examId');
    if (!section) {
      return NextResponse.json({ message: 'Section not found' }, { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && section.examId?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const text = formData.get('text');
    const questionType = formData.get('questionType') || 'single_select';
    const order = formData.get('order') ? Number(formData.get('order')) : 0;
    const imageFile = formData.get('image');

    if (!text) {
      return NextResponse.json({ message: 'Question text is required.' }, { status: 400 });
    }

    // Save question image
    const qImagePath = await saveUploadedFile(imageFile);

    // Create question
    const question = await Question.create({
      sectionId: secId,
      text: text.toString().trim(),
      questionType,
      order,
      image: qImagePath
    });

    // Extract options
    let i = 0;
    while (true) {
      const optText = formData.get(`option_text_${i}`);
      if (optText === null) break;

      const optScore = formData.get(`option_score_${i}`);
      const optImageFile = formData.get(`option_image_${i}`);

      const optTextStr = optText.toString().trim();
      if (optTextStr) {
        const optImagePath = await saveUploadedFile(optImageFile);
        await Option.create({
          questionId: question._id,
          text: optTextStr,
          score: optScore ? Number(optScore) : 0.0,
          image: optImagePath
        });
      }
      i++;
    }

    return NextResponse.json({ success: true, questionId: question._id.toString() });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

