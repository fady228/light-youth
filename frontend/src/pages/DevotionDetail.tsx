import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, DevotionDetail as Detail, Question, SubmissionResult } from '../api';
import { useAuth } from '../auth';
import ReadingCard from '../components/ReadingCard';
import StatusBadge from '../components/StatusBadge';
import { formatDay, useFetch } from '../hooks';

const MIN_OPEN = 20;
const typeLabel = { multiple_choice: 'Multiple choice', true_false: 'True or false', open: 'Your thoughts' } as const;

export default function DevotionDetail() {
  const { id = '' } = useParams();
  const { refresh } = useAuth();
  const { data, loading, error, reload } = useFetch(() => api.devotion(id), [id]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (loading && !data) return <p className="muted">Loading…</p>;
  if (error || !data) return <p className="error">{error || 'Devotion not found.'}</p>;

  const d: Detail = data;
  const result = d.submission;
  const ready = d.questions.every((q) => {
    const a = (answers[q.id] ?? '').trim();
    return q.type === 'open' ? a.length >= MIN_OPEN : !!a;
  });

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.submit(
        d.id,
        d.questions.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? '').trim() })),
      );
      await Promise.all([refresh(), reload()]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Link to="/devotions" className="back">← All devotions</Link>
      <p className="eyebrow">{formatDay(d.publishDate)}</p>
      <h1 className="display">{d.title}</h1>

      <p className="status-row"><StatusBadge status={d.status} completed={d.completed} /></p>

      {result && <ResultBanner result={result} />}
      {!result && d.status !== 'open' && (
        <div className="card notice-card" role="note">
          <strong>{d.status === 'archive' ? 'This one is from before you joined.' : 'This day was missed.'}</strong>
          <span className="muted">You can still answer it and see how you did, but no points are counted for it.</span>
        </div>
      )}

      <ReadingCard passageRef={d.passageRef} verseRef={d.verseRef} body={d.body} label={d.status === 'open' ? "Today's reading" : 'Reading'} />

      <h2 className="h2">Questions 🧠</h2>
      <div className="stack">
        {d.questions.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            value={answers[q.id] ?? ''}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            result={result?.answers.find((a) => a.questionId === q.id)}
          />
        ))}
      </div>

      {!result && (
        <>
          {submitError && <p className="error" role="alert">{submitError}</p>}
          <button className="btn btn-primary btn-inline" disabled={!ready || submitting} onClick={submit}>
            {submitting ? 'Locking in…' : d.status === 'open' ? 'Lock in my answers 🎯' : 'Save my answers (no points)'}
          </button>
        </>
      )}
    </>
  );
}

function ResultBanner({ result }: { result: SubmissionResult }) {
  const correct = result.answers.filter((a) => a.isCorrect === true).length;
  const graded = result.answers.filter((a) => a.isCorrect !== null).length;
  return (
    <div className="card card-blue result-banner" role="status">
      {result.late ? (
        <>
          <strong>✅ Answers saved — {correct} of {graded} correct</strong>
          <span className="muted">This was answered after its day, so no points were counted. Answer on the day to earn them!</span>
        </>
      ) : (
        <>
          <strong>🎉 You earned {result.pointsEarned} of {result.totalPossible} points!</strong>
          <span className="muted">Your answers are locked in. Come back tomorrow to keep your streak going.</span>
        </>
      )}
    </div>
  );
}

function QuestionCard({
  q, value, onChange, result,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
  result?: SubmissionResult['answers'][number];
}) {
  const locked = !!result;
  const options =
    q.type === 'true_false'
      ? [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]
      : (q.options ?? []).map((o) => ({ value: o, label: o }));

  return (
    <section className="card question">
      <p className="eyebrow">{typeLabel[q.type]} · {q.points} pts</p>
      <h3>{q.position}. {q.prompt}</h3>

      {q.type === 'open' ? (
        <>
          <textarea
            className="input"
            rows={5}
            placeholder="Write a few sentences…"
            value={locked ? result!.answer : value}
            onChange={(e) => onChange(e.target.value)}
            disabled={locked}
            maxLength={2000}
          />
          {!locked && (
            <p className="hint">
              At least {MIN_OPEN} characters{value.trim().length > 0 && value.trim().length < MIN_OPEN
                ? ` (${MIN_OPEN - value.trim().length} to go)` : ''}
            </p>
          )}
        </>
      ) : (
        <div className="options">
          {options.map((o) => {
            const chosen = (locked ? result!.answer : value) === o.value;
            const isCorrect = locked && result!.correctAnswer === o.value;
            const isWrong = locked && chosen && !isCorrect;
            return (
              <button
                key={o.value}
                type="button"
                className={`option${chosen ? ' chosen' : ''}${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
                aria-pressed={chosen}
                disabled={locked}
                onClick={() => onChange(o.value)}
              >
                {o.label}
                {isCorrect && ' ✓'}
              </button>
            );
          })}
        </div>
      )}

      {locked && (
        <p className="muted q-points">
          {result!.isCorrect === null ? 'Thanks for sharing!' : result!.isCorrect ? 'Correct!' : 'Not quite.'}{result!.pointsEarned > 0 && ` +${result!.pointsEarned} pts`}
        </p>
      )}
    </section>
  );
}
