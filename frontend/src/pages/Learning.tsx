import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ItemType, LearningItem } from '../api';
import LearningCard from '../components/LearningCard';
import LearningFilters from '../components/LearningFilters';
import SearchBox from '../components/SearchBox';
import { useDebounced, useFetch } from '../hooks';
import { TYPE_META } from '../learning';

const isType = (v: string | null): v is ItemType => v === 'article' || v === 'video' || v === 'sermon';

export default function Learning() {
  // The URL is the source of truth for every filter, so a view is shareable and survives refresh:
  //   /learning?q=grace&type=video&passage=Romans&tag=prayer
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = isType(params.get('type')) ? (params.get('type') as ItemType) : null;
  const passage = params.get('passage');
  const tag = params.get('tag');

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

  // The text box updates on every keystroke; the URL (and the request) only after a short pause.
  const [text, setText] = useState(q);
  const debounced = useDebounced(text.trim(), 300);
  useEffect(() => {
    if (debounced !== q) setParam('q', debounced || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  // Keep the box in sync if the URL changes from elsewhere (e.g. clicking "Learning" in the nav).
  useEffect(() => setText((prev) => (prev.trim() === q ? prev : q)), [q]);

  const items = useFetch(
    () => api.learning({ q, type: type ?? undefined, passage: passage ?? undefined, tag: tag ?? undefined }),
    [q, type, passage, tag],
  );
  const facets = useFetch(() => api.facets());
  const { data, loading, error, setData } = items;
  const filtering = !!(q || type || passage || tag);

  const toggle = async (item: LearningItem) => {
    const next = !item.saved;
    setData(data!.map((x) => (x.id === item.id ? { ...x, saved: next } : x))); // optimistic
    try {
      await api.setSaved(item.id, next);
    } catch {
      setData(data!); // roll back
    }
  };

  const summary = [
    q && `“${q}”`,
    type && TYPE_META[type].plural,
    passage,
    tag && `#${facets.data?.tags.find((t) => t.slug === tag)?.name ?? tag}`,
  ].filter(Boolean);

  return (
    <>
      <h1 className="display">Learning ✨</h1>
      <p className="lead">Articles, videos and sermons to help you grow. Save your favorites!</p>

      <SearchBox value={text} onChange={setText} placeholder="Search titles, summaries and notes…" label="Search learning" />
      <LearningFilters
        facets={facets.data}
        type={type}
        passage={passage}
        tag={tag}
        onType={(t) => setParam('type', t)}
        onPassage={(b) => setParam('passage', b)}
        onTag={(s) => setParam('tag', s)}
      />

      {error && <p className="error">{error}</p>}
      {filtering && data && (
        <p className="results-line" aria-live="polite">
          {data.length} result{data.length === 1 ? '' : 's'} · {summary.join(' · ')} ·{' '}
          <button className="linklike" onClick={() => { setText(''); setParams({}, { replace: true }); }}>
            Clear filters
          </button>
        </p>
      )}

      {loading && !data && <p className="muted">Loading…</p>}
      {data?.length === 0 && (
        <p className="muted">{filtering ? 'Nothing matches that. Try different words or fewer filters.' : 'Nothing here yet. Check back soon!'}</p>
      )}
      <div className={`grid-2${loading && data ? ' dim' : ''}`}>
        {data?.map((i) => <LearningCard key={i.id} item={i} onToggleSave={toggle} />)}
      </div>
    </>
  );
}
