import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Section, Question, Option, CandidateAnswer } from '@/lib/models';
import { uploadToVercelBlob } from '@/lib/vercelBlob';

async function saveUploadedFile(file) {
  return await uploadToVercelBlob(file);
}

export async function GET(request, { params }) {
  try {
    const { qId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const question = await Question.findById(qId).populate('sectionId');
    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    const options = await Option.find({ questionId: qId });

    return NextResponse.json({
      question,
      options
    });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { qId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const question = await Question.findById(qId).populate({
      path: 'sectionId',
      populate: { path: 'examId' }
    });
    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    // Role check
    const exam = question.sectionId?.examId;
    if (!session.isSuperuser && exam?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const text = formData.get('text');
    const questionType = formData.get('questionType') || 'single_select';
    const order = formData.get('order') ? Number(formData.get('order')) : 0;
    const imageFile = formData.get('image');
    const clearImage = formData.get('clear_image') === 'true';

    if (!text) {
      return NextResponse.json({ message: 'Question text is required.' }, { status: 400 });
    }

    // Handle question image update
    if (clearImage) {
      question.image = null;
    } else {
      const qImagePath = await saveUploadedFile(imageFile);
      if (qImagePath) {
        question.image = qImagePath;
      }
    }

    question.text = text.toString().trim();
    question.questionType = questionType;
    question.order = order;
    await question.save();

    // Handle options: Preserve IDs of kept options, create new ones, delete removed ones
    const existingOptions = await Option.find({ questionId: qId });
    const existingOptionsMap = new Map(existingOptions.map(opt => [opt._id.toString(), opt]));
    const keptOptionIds = new Set();

    let i = 0;
    while (true) {
      const optText = formData.get(`option_text_${i}`);
      if (optText === null) break;

      const optId = formData.get(`option_id_${i}`);
      const optScore = formData.get(`option_score_${i}`);
      const optImageFile = formData.get(`option_image_${i}`);
      const optClearImage = formData.get(`option_clear_image_${i}`) === 'true';

      const optTextStr = optText.toString().trim();
      if (optTextStr) {
        let option;
        if (optId && existingOptionsMap.has(optId.toString())) {
          // Update existing option
          option = existingOptionsMap.get(optId.toString());
          option.text = optTextStr;
          option.score = optScore ? Number(optScore) : 0.0;
          
          if (optClearImage) {
            option.image = null;
          } else {
            const optImagePath = await saveUploadedFile(optImageFile);
            if (optImagePath) {
              option.image = optImagePath;
            }
          }
          await option.save();
          keptOptionIds.add(optId.toString());
        } else {
          // Create new option
          const optImagePath = await saveUploadedFile(optImageFile);
          option = await Option.create({
            questionId: qId,
            text: optTextStr,
            score: optScore ? Number(optScore) : 0.0,
            image: optImagePath
          });
          keptOptionIds.add(option._id.toString());
        }
      }
      i++;
    }

    // Delete options that were not kept
    for (const [idStr, option] of existingOptionsMap.entries()) {
      if (!keptOptionIds.has(idStr)) {
        await Option.findByIdAndDelete(idStr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { qId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const question = await Question.findById(qId).populate({
      path: 'sectionId',
      populate: { path: 'examId' }
    });
    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    // Role check
    const exam = question.sectionId?.examId;
    if (!session.isSuperuser && exam?.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Delete options
    await Option.deleteMany({ questionId: qId });

    // Delete candidate answers
    await CandidateAnswer.deleteMany({ questionId: qId });

    // Delete question
    await Question.findByIdAndDelete(qId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

