import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { Section } from '@/lib/models';
import EditSectionClient from './EditSectionClient';

export default async function EditSectionPage({ params }) {
  const { id: examId, secId } = await params;
  await dbConnect();
  
  const section = await Section.findById(secId);
  if (!section) {
    notFound();
  }

  const serializedSection = {
    id: section._id.toString(),
    name: section.name,
    description: section.description || '',
    durationMinutes: section.durationMinutes,
    durationSeconds: section.durationSeconds,
    order: section.order
  };

  return <EditSectionClient examId={examId} section={serializedSection} />;
}
