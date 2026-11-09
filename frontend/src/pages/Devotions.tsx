import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, DevotionStatus } from '../api';
import SearchBox from '../components/SearchBox';
import StatusBadge from '../components/StatusBadge';
import { formatDay, useDebounced, useFetch } from '../hooks';

type Filter = 'open' | 'done' | 'missed';
const isFilter = (v: string | null): v is Filter => v === 'open' || v === 'done' || v === 'missed';

function actionText(status: DevotionStatus, completed: boolean) {
  if (completed) return 'See your answers';
  if (status === 'open') return "Start today's reading";
  return 'Answer anyway (no points)';
}

export default function Devotions() {
  // Filters live in the URL so a view is shareable and survives refresh: /devotions?status=missed&book=John
  const [params, setParams] = useSearchParams();
  const status = isFilter(params.get('status')) ? (params.get('status') as Filter) : null;
  const book = params.get('book');
  const q = params.get('q') ?? '';

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const [text, setText] = useState(q);
  const debounced = useDebounced(text.trim(), 300);
  useEffect(() => {
    if (debounced !== q) setParam('q', debounced || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  useEffect(() => setText((prev) => (prev.trim() === q ? prev : q)), [q]);

  const { data, loading, error } = useFetch(
    () => api.devotions({ status: status ?? undefined, book: book ?? undefined, q }),
    [status, book, q],
  );
  const filtering = !!(status || book || q);
  const chips: { key: Filter | null; label: string; count?: number }[] = [
    { key: null, label: 'All', count: data?.counts.all },
    { key: 'open', label: 'To do', count: data?.counts.open },
    { key: 'done', label: 'Done', count: data?.counts.done },
    { key: 'missed', label: 'Missed', count: data?.counts.missed },
  ];

  return (
    <>
      <h1 className="display">Daily Devotions 📖</h1>
      <p className="lead">
        Read the passage, then answer a few questions to grab your points. Answer on the day to earn points — a missed day
        can still be answered, but it won't earn any.
      </p>

      <SearchBox value={text} onChange={setText} placeholder="Search by title or passage…" label="Search devotions" />
      <div className="filters">
        <div className="filter-line" role="group" aria-label="Filter by status">
          <span className="filter-label">Show</span>
          <div className="tag-bar">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                className={`tag-chip${status === c.key ? ' on' : ''}`}
                aria-pressed={status === c.key}
                onClick={() => setParam('status', c.key)}
              >
                {c.label}
                {c.count !== undefined && <span className="count">{c.count}</span>}
              </button>
            ))}
          </div>
        </div>
        {data && data.books.length > 0 && (
          <div className="filter-line">
            <label className="filter-label" htmlFor="book-filter">Book</label>
            <select id="book-filter" className="select" value={book ?? ''} onChange={(e) => setParam('book', e.target.value || null)}>
              <option value="">Any book of the Bible</option>
              {data.books.map((b) => <option key={b.book} value={b.book}>{b.book} ({b.count})</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {filtering && data && (
        <p className="results-line" aria-live="polite">
          {data.items.length} devotion{data.items.length === 1 ? '' : 's'} ·{' '}
          <button className="linklike" onClick={() => { setText(''); setParams({}, { replace: true }); }}>Clear filters</button>
        </p>
      )}
      {loading && !data && <p className="muted">Loading…</p>}
      {data?.items.length === 0 && (
        <p className="muted">{filtering ? 'No devotions match those filters.' : 'No devotions yet. Check back soon!'}</p>
      )}

      <div className={`stack${loading && data ? ' dim' : ''}`}>
        {data?.items.map((d) => (
          <Link key={d.id} to={`/devotion/${d.id}`} className={`card list-card st-card-${d.status}`}>
            <div className="row-between">
              <p className="eyebrow">{formatDay(d.publishDate, 'short')}</p>
              <p className="muted">{d.passageRef}</p>
            </div>
            <h2>{d.title}</h2>
            <div className="row-between">
              <span className="link">{actionText(d.status, d.completed)} →</span>
              <StatusBadge status={d.status} completed={d.completed} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
