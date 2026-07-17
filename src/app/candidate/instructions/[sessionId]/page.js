import { notFound, redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import { ExamSession, Section } from '@/lib/models';
import '@/app/globals.css';

export default async function InstructionsPage({ params }) {
  const { sessionId } = await params;

  await dbConnect();

  const session = await ExamSession.findById(sessionId)
    .populate('candidateId')
    .populate('examId');

  if (!session) {
    notFound();
  }

  if (session.status === 'completed') {
    redirect(`/candidate/completed/${sessionId}`);
  }

  const candidate = session.candidateId;
  const exam = session.examId;

  // Server Action to start the exam timer
  async function handleBegin() {
    'use server';
    await dbConnect();
    
    const activeSession = await ExamSession.findById(sessionId);
    if (!activeSession) return;

    if (!activeSession.currentSectionId) {
      const firstSection = await Section.findOne({ examId: activeSession.examId }).sort({ order: 1 });
      if (firstSection) {
        activeSession.currentSectionId = firstSection._id;
      }
    }
    
    activeSession.sectionStartedAt = new Date();
    await activeSession.save();

    redirect(`/candidate/exam-run/${sessionId}`);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '650px' }}>
        
        <h2 style={{
          fontSize: '1.8rem',
          color: '#fff',
          borderBottom: '1px solid var(--glass-border)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          Assessment Instructions
        </h2>

        <div style={{ marginBottom: '2rem', fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>Candidate: <strong style={{ color: '#fff' }}>{candidate?.fullName}</strong></div>
          <div>Assessment: <strong style={{ color: '#fff' }}>{exam?.title}</strong></div>
          {exam?.description && (
            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
              {exam.description}
            </div>
          )}
        </div>

        <div style={{ lineHeight: '1.7', color: 'var(--text-primary)', marginBottom: '2.5rem' }}>
          <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Assessment Rules:</h4>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>This assessment consists of multiple sections. Each section has its own **individual time limit**.</li>
            <li>Once you start a section, the timer runs continuously. It **cannot be paused**.</li>
            <li>If the section timer expires, any answers you selected will be auto-submitted and you will advance to the next section automatically.</li>
            <li>Do not close your browser tab or navigate away. Your answers are auto-saved in the background, allowing you to resume if needed, but the timer will **continue running** in the background.</li>
            <li>Ensure you have a stable internet connection before beginning.</li>
          </ul>
        </div>

        <form action={handleBegin}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
            Begin Assessment &rarr;
          </button>
        </form>

      </div>
    </div>
  );
}
