import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchBackendJson } from '@frontend/lib/backendFetch';
import { getBlobImageSrc } from '@frontend/lib/getBlobImageSrc';

export default async function ResultDetailPage({ params }) {
  const { id: resultId } = await params;
  const data = await fetchBackendJson(`/api/admin/results/${resultId}/scorecard`);
  if (!data) notFound();
  const { result, candidate, exam, assignment, sectionResults, sections } = data;
  const questionsBySection = data.questions.reduce((acc, question) => {
    (acc[question.sectionId] ||= []).push(question);
    return acc;
  }, {});
  const optionsByQuestion = data.options.reduce((acc, option) => {
    (acc[option.questionId] ||= []).push(option);
    return acc;
  }, {});
  const answersMap = new Map(data.answers.map((answer) => [answer.questionId, answer]));
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

      <div className="grid-1-2" style={{ marginBottom: '3rem' }}>
        
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
                <div key={sr.id} className="section-score-row">
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
                  const positiveScores = qOptions.map((option) => option.score > 0 ? option.score : 0);
                  const maxPossibleScore = ['multi_select', 'multi_image_choice'].includes(q.questionType)
                    ? positiveScores.reduce((sum, score) => sum + score, 0)
                    : Math.max(0, ...positiveScores);

                  return (
                    <div key={q._id.toString()} className="admin-question-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Question {qIndex + 1} - {({ single_select: 'Single choice', multi_select: 'Multiple choice', rating_scale: 'Rating scale', image_choice: 'Image choice', multi_image_choice: 'Multiple image choice' })[q.questionType] || 'Single choice'}
                        </span>
                        <span style={{ background: earnedScore > 0 ? 'color-mix(in srgb, var(--accent-green) 12%, transparent)' : 'color-mix(in srgb, var(--accent-rose) 12%, transparent)', border: `1px solid ${earnedScore > 0 ? 'var(--accent-green)' : 'var(--accent-rose)'}`, padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', color: earnedScore > 0 ? 'var(--accent-green)' : 'var(--accent-rose)' }}>
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
                                <span style={{ fontWeight: 'bold', color: isCorrect ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
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
