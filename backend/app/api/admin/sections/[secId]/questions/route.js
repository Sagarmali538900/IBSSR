import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Section, Question, Option } from '@/models';
import { uploadToVercelBlob } from '@/vercelBlob';
import { validateImageUpload } from '@/lib/validation';
import { ids, schemas } from '@/lib/schemas';

async function saveUploadedFile(file) {
  return await uploadToVercelBlob(file);
}

export async function POST(request, { params }) {
  try {
    const { secId } = await params;
    if (!ids.objectId.safeParse(secId).success) return NextResponse.json({ message: 'Invalid section ID.' }, { status: 400 });
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

    let formData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ message: 'Submit the question as valid multipart form data.' }, { status: 400 }); }
    const text = formData.get('text');
    const questionType = formData.get('questionType') || 'single_select';
    const estimatedTimeSeconds = formData.get('estimatedTimeSeconds') || 0;
    const order = formData.get('order') ? Number(formData.get('order')) : 0;
    const imageFile = formData.get('image');
    const rawOptions = [];
    for (let i = 0; formData.has(`option_text_${i}`); i++) {
      if (i >= 100) return NextResponse.json({ message: 'A question can have at most 100 answer options.' }, { status: 400 });
      const optionText = String(formData.get(`option_text_${i}`) || '').trim();
      if (optionText) rawOptions.push({ text: optionText, score: formData.get(`option_score_${i}`) || 0 });
    }
    const validation = schemas.questionFields.safeParse({ text, questionType, estimatedTimeSeconds, order, options: rawOptions });
    if (!validation.success) return NextResponse.json({ message: validation.error.issues[0]?.message || 'Please check the question details.' }, { status: 400 });
    const imageValidation = validateImageUpload(imageFile);
    if (!imageValidation.success) return NextResponse.json({ message: imageValidation.message }, { status: 400 });
    for (let i = 0; formData.has(`option_image_${i}`); i++) {
      const optionImageValidation = validateImageUpload(formData.get(`option_image_${i}`));
      if (!optionImageValidation.success) return NextResponse.json({ message: optionImageValidation.message }, { status: 400 });
    }

    // Save question image
    const qImagePath = await saveUploadedFile(imageFile);

    // Create question
    const question = await Question.create({
      sectionId: secId,
      text: validation.data.text,
      questionType: validation.data.questionType,
      estimatedTimeSeconds: validation.data.estimatedTimeSeconds,
      order: validation.data.order,
      image: qImagePath
    });

    // Extract options
    for (let i = 0; i < validation.data.options.length; i++) {
      const { text: optTextStr, score } = validation.data.options[i];
      const optImageFile = formData.get(`option_image_${i}`);
      const optImagePath = await saveUploadedFile(optImageFile);
      await Option.create({ questionId: question._id, text: optTextStr, score, image: optImagePath });
    }

    return NextResponse.json({ success: true, questionId: question._id.toString() });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

