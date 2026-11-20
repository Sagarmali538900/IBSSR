import SectionForm from '../SectionForm';

export default async function AddSectionPage({ params }) {
  const { id: examId } = await params;
  return <SectionForm examId={examId} />;
}
