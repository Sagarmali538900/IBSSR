import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { Question, Option } from '@/lib/models';
import EditQuestionClient from './EditQuestionClient';

export default async function EditQuestionPage({ params }) {
  const { id: examId, qId } = await params;
  await dbConnect();

  const question = await Question.findById(qId);
  if (!question) {
    notFound();
  }

  const options = await Option.find({ questionId: qId });

  const serializedQuestion = {
    id: question._id.toString(),
    sectionId: question.sectionId.toString(),
    text: question.text,
    image: question.image || null,
    questionType: question.questionType,
    order: question.order
  };

  const serializedOptions = options.map(opt => ({
    id: opt._id.toString(),
    text: opt.text,
    image: opt.image || null,
    score: opt.score
  }));

  return (
    <EditQuestionClient
      examId={examId}
      question={serializedQuestion}
      initialOptions={serializedOptions}
    />
  );
}
