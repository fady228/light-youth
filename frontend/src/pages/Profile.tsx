import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, PastAnswer, PastAnswers } from '../api';
import { useAuth } from '../auth';
import LearningCard from '../components/LearningCard';
import SearchBox from '../components/SearchBox';
import { formatDay, useDebounced, useFetch } from '../hooks';

const PAGE = 10;
type Status = 'done' | 'late' | null;

export default function Profile() {
  const { user } = useAuth();
  const saved = useFetch(() => api.savedLearning());
  if (!user) return null;

  return (
    <>
      <h1 className="display">{user.displayName} {user.avatarEmoji}</h1>

      <div className="grid-3 stats">
        <div className="card">
          <p className="eyebrow">Rank</p>
          <p className="big-sm orange">#{user.rank}</p>
          <p className="muted">of {user.totalUsers}</p>
        </div>
        <div className="card">
          <p className="eyebrow">Points</p>
          <p className="big-sm orange">{user.points}</p>
          <p className="muted">this summer</p>
        </div>
        <div className="card">
          <p className="eyebrow">Streak</p>
          <p className="big-sm orange">{user.streak}</p>
          <p className="muted">days in a row ⚡</p>
        </div>
      </div>

      <PastAnswersSection />

      <h2 className="h2">Saved learning 🔖</h2>
      {saved.data?.length === 0 && <p className="muted">Nothing saved yet. Tap the tag on anything in Learning to keep it here.</p>}
      <div className="grid-2">
        {saved.data?.map((i) => <LearningCard key={i.id} item={i} showBadge={false} />)}
      </div>
    </>
  );
}

/** Every devotion you've answered. Grows daily, so it can be searched, filtered by Bible book, and paged. */
function PastAnswersSection() {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const [book, setBook] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const [items, setItems] = useState<PastAnswer[]>([]);
  const [meta, setMeta] = useState<PastAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the first page whenever a filter changes; "Show more" appends the next page.
  const load = (offset: number, cancelled?: () => boolean) => {
    setLoading(true);
    setError('');
    api
      .myAnswers({ q, book: book ?? undefined, status: status ?? undefined, limit: PAGE, offset })
      .then((res) => {
        if (cancelled?.()) return;
        setMeta(res);
        setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
      })
      .catch((e) => !cancelled?.() && setError(e.message))
      .finally(() => !cancelled?.() && setLoading(false));
  };
  useEffect(() => {
    let stop = false;
    load(0, () => stop);
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, book, status]);

  const filtering = !!(q || book || status);
  const total = meta?.total ?? 0;
  const chips: { key: Status; label: string; count?: number }[] = [
    { key: null, label: 'All', count: meta?.counts.all },
    { key: 'done', label: 'On time', count: meta?.counts.done },
    { key: 'late', label: 'Answered late', count: meta?.counts.late },
  ];

  return (
    <>
      <h2 className="h2">Past answers 📝</h2>

      {meta && meta.counts.all === 0 ? (
        <p className="muted">No answers yet — try today's devotion!</p>
      ) : (
        <>
          <SearchBox value={text} onChange={setText} placeholder="Search your answers by title or passage…" label="Search past answers" />
          <div className="filters">
            <div className="filter-line" role="group" aria-label="Filter by when you answered">
              <span className="filter-label">Show</span>
              <div className="tag-bar">
                {chips.map((c) => (
                  <button key={c.label} type="button" className={`tag-chip${status === c.key ? ' on' : ''}`} aria-pressed={status === c.key} onClick={() => setStatus(c.key)}>
                    {c.label}{c.count !== undefined && <span className="count">{c.count}</span>}
                  </button>
                ))}
              </div>
            </div>
            {meta && meta.books.length > 0 && (
              <div className="filter-line">
                <label className="filter-label" htmlFor="answers-book">Book</label>
                <select id="answers-book" className="select" value={book ?? ''} onChange={(e) => setBook(e.target.value || null)}>
                  <option value="">Any book of the Bible</option>
                  {meta.books.map((b) => <option key={b.book} value={b.book}>{b.book} ({b.count})</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}
          {filtering && meta && (
            <p className="results-line" aria-live="polite">
              {total} answer{total === 1 ? '' : 's'} ·{' '}
              <button className="linklike" onClick={() => { setText(''); setBook(null); setStatus(null); }}>Clear filters</button>
            </p>
          )}
          {meta && items.length === 0 && !loading && <p className="muted">No answers match those filters.</p>}

          <div className={`stack${loading && items.length > 0 ? ' dim' : ''}`}>
            {items.map((a) => (
              <Link key={a.id} to={`/devotion/${a.devotionId}`} className="card list-card compact answer-row">
                <div className="answer-main">
                  <p className="eyebrow">{formatDay(a.publishDate, 'short')} · {a.passageRef}</p>
                  <h3>{a.title}</h3>
                </div>
                <div className="answer-side">
                  <span className={`badge status ${a.late ? 'st-late' : 'st-done'}`}>{a.late ? 'Late · 0 pts' : `+${a.pointsEarned} pts`}</span>
                  <span className="link">View answers →</span>
                </div>
              </Link>
            ))}
          </div>

          {items.length < total && (
            <button className="btn btn-outline btn-inline" disabled={loading} onClick={() => load(items.length)}>
              {loading ? 'Loading…' : `Show more (${total - items.length} left)`}
            </button>
          )}
        </>
      )}
    </>
  );
}
