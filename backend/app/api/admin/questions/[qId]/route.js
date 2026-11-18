import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Section, Question, Option, CandidateAnswer } from '@/models';
import { uploadToVercelBlob } from '@/vercelBlob';
import { validateImageUpload } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

async function saveUploadedFile(file) {
  return await uploadToVercelBlob(file);
}

export async function GET(request, { params }) {
  try {
    const { qId } = await params;
    if (!ids.objectId.safeParse(qId).success) return NextResponse.json({ message: 'Invalid question ID.' }, { status: 400 });
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
    if (!ids.objectId.safeParse(qId).success) return NextResponse.json({ message: 'Invalid question ID.' }, { status: 400 });
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

    let formData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ message: 'Submit the question as valid multipart form data.' }, { status: 400 }); }
    const text = formData.get('text');
    const questionType = formData.get('questionType') || 'single_select';
    const order = formData.get('order') ? Number(formData.get('order')) : 0;
    const imageFile = formData.get('image');
    const clearImage = formData.get('clear_image') === 'true';
    const rawOptions = [];
    for (let i = 0; formData.has(`option_text_${i}`); i++) {
      if (i >= 100) return NextResponse.json({ message: 'A question can have at most 100 answer options.' }, { status: 400 });
      const optionText = String(formData.get(`option_text_${i}`) || '').trim();
      if (optionText) rawOptions.push({ id: formData.get(`option_id_${i}`) || undefined, text: optionText, score: formData.get(`option_score_${i}`) || 0 });
    }
    const validation = schemas.questionFields.safeParse({ text, questionType, order, options: rawOptions });
    if (!validation.success) return NextResponse.json({ message: validation.error.issues[0]?.message || 'Please check the question details.' }, { status: 400 });
    const imageValidation = validateImageUpload(imageFile);
    if (!imageValidation.success) return NextResponse.json({ message: imageValidation.message }, { status: 400 });
    for (let i = 0; formData.has(`option_image_${i}`); i++) {
      const optionImageValidation = validateImageUpload(formData.get(`option_image_${i}`));
      if (!optionImageValidation.success) return NextResponse.json({ message: optionImageValidation.message }, { status: 400 });
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

    question.text = validation.data.text;
    question.questionType = validation.data.questionType;
    question.order = validation.data.order;
    await question.save();

    // Handle options: Preserve IDs of kept options, create new ones, delete removed ones
    const existingOptions = await Option.find({ questionId: qId });
    const existingOptionsMap = new Map(existingOptions.map(opt => [opt._id.toString(), opt]));
    const keptOptionIds = new Set();

    for (let i = 0; i < validation.data.options.length; i++) {
      const { id: optId, text: optTextStr, score } = validation.data.options[i];
      const optImageFile = formData.get(`option_image_${i}`);
      const optClearImage = formData.get(`option_clear_image_${i}`) === 'true';
      let option;
      if (optId && existingOptionsMap.has(optId.toString())) {
          // Update existing option
          option = existingOptionsMap.get(optId.toString());
          option.text = optTextStr;
          option.score = score;
          
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
            score,
            image: optImagePath
          });
          keptOptionIds.add(option._id.toString());
      }
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
    if (!ids.objectId.safeParse(qId).success) return NextResponse.json({ message: 'Invalid question ID.' }, { status: 400 });
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

