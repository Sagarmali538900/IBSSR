import Link from 'next/link';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { Exam } from '@/lib/models';
import EditExamClient from './EditExamClient';

export default async function EditExamPage({ params }) {
  const { id } = await params;
  await dbConnect();
  
  const exam = await Exam.findById(id);
  if (!exam) {
    notFound();
  }

  const serializedExam = {
    id: exam._id.toString(),
    title: exam.title,
    description: exam.description || ''
  };

  return <EditExamClient exam={serializedExam} />;
}
