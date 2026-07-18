import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ExamResult, SectionResult, ExamSession, Section, Question, Option, CandidateAnswer } from '@/lib/models';
import { getBlobImageSrc } from '@/lib/getBlobImageSrc';

export default async function ResultDetailPage({ params }) {
  const { id: resultId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    notFound();
  }

  await dbConnect();

  // Find result details
  const result = await ExamResult.findById(resultId)
    .populate({
      path: 'sessionId',
      populate: [
        { path: 'candidateId' },
        { path: 'examId' },
        { path: 'assignmentId' }
      ]
    });

  if (!result) {
    notFound();
  }

  const examSession = result.sessionId;
  if (!examSession) {
    notFound();
  }

  const candidate = examSession.candidateId;
  const exam = examSession.examId;
  const assignment = examSession.assignmentId;

  // Role check: Franchise can only view their own candidate results
  if (!session.isSuperuser && assignment?.createdBy?.toString() !== session.userId) {
    return new Response('Forbidden', { status: 403 });
  }

  const sectionResults = await SectionResult.find({ examResultId: resultId })
    .populate('sectionId');

  const candidateAnswers = await CandidateAnswer.find({ sessionId: examSession._id })
    .populate('selectedOptionIds');

  const answersMap = new Map(
    candidateAnswers.map(ans => [ans.questionId.toString(), ans])
  );

  // Compile full scorecard details
  const sections = exam ? await Section.find({ examId: exam._id }).sort({ order: 1 }) : [];
  const sectionIds = sections.map(s => s._id);

  const questions = exam ? await Question.find({ sectionId: { $in: sectionIds } }).sort({ order: 1 }) : [];
  const questionIds = questions.map(q => q._id);

  const options = exam ? await Option.find({ questionId: { $in: questionIds } }) : [];

  // Group questions by section
  const questionsBySection = questions.reduce((acc, q) => {
    if (!acc[q.sectionId.toString()]) acc[q.sectionId.toString()] = [];
    acc[q.sectionId.toString()].push(q);
    return acc;
  }, {});

  // Group options by question
  const optionsByQuestion = options.reduce((acc, opt) => {
    if (!acc[opt.questionId.toString()]) acc[opt.questionId.toString()] = [];
    acc[opt.questionId.toString()].push(opt);
    return acc;
  }, {});

  return (
    <div>
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/results" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; Back to Results
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', margin: 0 }}>Assessment Scorecard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Candidate: <strong>{candidate?.fullName}</strong> ({candidate?.email})
          </p>
        </div>
        <span className="alert-success" style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          Exam Code: {assignment?.examCode}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        
        {/* Left Side: Score Metric Card */}
        <div className="glass-card" style={{ textAlign: 'center', height: 'fit-content' }}>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>Overall Score</h3>
          
          <div className="result-score-circle">
            <div className="result-score-pct">{result.overallScorePercentage}%</div>
            <div className="result-score-label">Earned Score</div>
          </div>

          <div style={{ textAlign: 'left', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <div>Assessment: <strong style={{ color: '#fff' }}>{exam?.title}</strong></div>
            <div>Mobile Number: <strong style={{ color: '#fff' }}>{candidate?.mobileNumber}</strong></div>
            <div>Completed At: <strong style={{ color: '#fff' }}>{new Date(result.completedAt).toLocaleString()}</strong></div>
          </div>
        </div>

        {/* Right Side: Section Progress metrics */}
        <div className="glass-card">
          <h3 style={{ color: '#fff', fontSize: '1.3rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            Section-wise Metrics
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sectionResults.map((sr) => {
              const secName = sr.sectionId?.name || 'Deleted Section';
              const scorePct = sr.scorePercentage;
              return (
                <div key={sr._id.toString()} className="section-score-row">
                  <div className="section-score-meta">
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{secName}</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{scorePct}%</span>
                  </div>
                  <div className="section-score-bar-bg">
                    <div className="section-score-bar" style={{ width: `${scorePct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Part: Detailed responses */}
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: '#fff' }}>
        Question-by-Question Response Log
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {sections.map((section) => {
          const secQuestions = questionsBySection[section._id.toString()] || [];

          return (
            <div key={section._id.toString()}>
              <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.3rem', marginBottom: '1rem' }}>
                {section.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {secQuestions.map((q, qIndex) => {
                  const ans = answersMap.get(q._id.toString());
                  const selectedOptionIds = ans ? ans.selectedOptionIds.map(opt => opt._id.toString()) : [];
                  const qOptions = optionsByQuestion[q._id.toString()] || [];

                  // Calculate score earned
                  let earnedScore = 0.0;
                  if (ans) {
                    earnedScore = ans.selectedOptionIds.reduce((sum, opt) => sum + opt.score, 0);
                  }

                  // Max possible score for this question (sum of option scores > 0)
                  const maxPossibleScore = qOptions.reduce((sum, opt) => sum + (opt.score > 0 ? opt.score : 0), 0);

                  return (
                    <div key={q._id.toString()} className="admin-question-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Question {qIndex + 1} - {q.questionType === 'single_select' ? 'Single Choice' : 'Multi-Select'}
                        </span>
                        <span style={{ background: earnedScore > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: `1px solid ${earnedScore > 0 ? 'var(--accent-green)' : 'var(--accent-rose)'}`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: earnedScore > 0 ? '#34d399' : '#f87171' }}>
                          Score: {earnedScore} / {maxPossibleScore}
                        </span>
                      </div>

                      <h4 style={{ color: '#fff', fontWeight: 500, fontSize: '1.1rem', marginBottom: '1rem' }}>
                        {q.text}
                      </h4>

                      {/* Question image */}
                      {q.image && (
                        <div style={{ marginBottom: '1rem' }}>
                          <img src={getBlobImageSrc(q.image)} alt="Question Graphic" style={{ maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                        </div>
                      )}

                      {/* Options */}
                      <ul className="admin-opt-list">
                        {qOptions.map((opt) => {
                          const isSelected = selectedOptionIds.includes(opt._id.toString());
                          const isCorrect = opt.score > 0; // Positive score choice
                          
                          let optClass = 'admin-opt-item';
                          if (isSelected && isCorrect) {
                            optClass += ' selected correct';
                          } else if (isSelected) {
                            optClass += ' selected';
                          } else if (isCorrect) {
                            optClass += ' correct';
                          }

                          return (
                            <li key={opt._id.toString()} className={optClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--glass-border)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {opt.image && (
                                  <img src={getBlobImageSrc(opt.image)} alt="Option Image" style={{ maxHeight: '30px', borderRadius: '4px' }} />
                                )}
                                <span style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                                  {opt.text}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {isSelected && (
                                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--accent-pink)' }}>
                                    [Candidate Selected]
                                  </span>
                                )}
                                <span style={{ fontWeight: 'bold', color: isCorrect ? '#34d399' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  Weight: {opt.score > 0 ? `+${opt.score}` : opt.score}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
