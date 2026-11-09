import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLearning, api, ItemType } from '../../api';
import { emptyLearning, LearningForm, toInput } from '../../components/admin/LearningForm';
import LearningFilters from '../../components/LearningFilters';
import SearchBox from '../../components/SearchBox';
import { useDebounced, useFetch } from '../../hooks';
import { TYPE_META } from '../../learning';

export default function AdminLearningPage() {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const [type, setType] = useState<ItemType | null>(null);
  const [passage, setPassage] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(
    () => api.adminLearning({ q, type: type ?? undefined, passage: passage ?? undefined, tag: tag ?? undefined }),
    [q, type, passage, tag],
  );
  const facets = useFetch(() => api.adminFacets());
  const [editing, setEditing] = useState<AdminLearning | 'new' | null>(null);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');
  const filtering = !!(q || type || passage || tag);

  // If a selected tag/passage no longer exists (its last item was deleted or changed), drop that filter.
  useEffect(() => {
    if (!facets.data) return;
    if (tag && !facets.data.tags.some((t) => t.slug === tag)) setTag(null);
    if (passage && !facets.data.passages.some((p) => p.book === passage)) setPassage(null);
  }, [facets.data, tag, passage]);

  const refresh = () => {
    reload();
    facets.reload();
  };

  const remove = async (i: AdminLearning) => {
    const extra = i.type === 'sermon' ? ' Its PDF will be deleted too.' : '';
    if (!window.confirm(`Delete "${i.title}"?${extra} It will also disappear from users' saved lists.`)) return;
    setMsg('');
    try {
      await api.deleteLearning(i.id);
      setNotice('Deleted.');
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const flip = async (i: AdminLearning, field: 'featured' | 'published') => {
    setMsg('');
    try {
      await api.updateLearning(i.id, { [field]: !i[field] });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (editing) {
    return (
      <LearningForm
        initial={editing === 'new' ? emptyLearning : toInput(editing)}
        id={editing === 'new' ? null : editing.id}
        onDone={() => {
          setNotice(editing === 'new' ? 'Saved.' : 'Changes saved.');
          setEditing(null);
          refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <div className="row-between page-head">
        <h1 className="display">Learning</h1>
        <button className="btn btn-primary" onClick={() => { setNotice(''); setEditing('new'); }}>+ Add learning</button>
      </div>
      <p className="lead">Search, filter, view, edit, feature, hide or remove content.</p>

      <SearchBox value={text} onChange={setText} placeholder="Search titles, summaries, notes and tags…" label="Search learning" />
      <LearningFilters facets={facets.data} type={type} passage={passage} tag={tag} onType={setType} onPassage={setPassage} onTag={setTag} />

      {notice && <p className="notice" role="status">{notice}</p>}
      {(error || msg) && <p className="error">{error || msg}</p>}
      {filtering && data && (
        <p className="results-line" aria-live="polite">
          {data.length} result{data.length === 1 ? '' : 's'} ·{' '}
          <button className="linklike" onClick={() => { setText(''); setType(null); setPassage(null); setTag(null); }}>Clear filters</button>
        </p>
      )}
      {loading && !data && <p className="muted">Loading…</p>}
      {data?.length === 0 &&
        (filtering ? (
          <p className="muted">Nothing matches that.</p>
        ) : (
          <p className="muted">Nothing here yet. Use “Add learning” to add your first item.</p>
        ))}

      <div className={`stack${loading && data ? ' dim' : ''}`}>
        {data?.map((i) => (
          <div key={i.id} className="card admin-row">
            <div className="admin-row-main">
              <p className="eyebrow">{TYPE_META[i.type].icon} {TYPE_META[i.type].label}</p>
              <h3><Link to={`/admin/learning/${i.id}`} className="row-link">{i.emoji} {i.title}</Link></h3>
              <p className="muted summary-clamp">{i.summary}</p>
              {(i.passages.length > 0 || i.tags.length > 0) && (
                <p className="tags">
                  {i.passages.map((p) => (
                    <button key={p.reference} className="tag tag-link passage" onClick={() => setPassage(p.book)} title={`Filter by ${p.book}`}>✝ {p.reference}</button>
                  ))}
                  {i.tags.map((t) => (
                    <button key={t.slug} className="tag tag-link" onClick={() => setTag(t.slug)} title={`Filter by ${t.name}`}>#{t.name}</button>
                  ))}
                </p>
              )}
              <div className="chips">
                <button className={`chip${i.featured ? ' on' : ''}`} onClick={() => flip(i, 'featured')} aria-pressed={i.featured}>
                  {i.featured ? '★ Featured' : '☆ Not featured'}
                </button>
                <button className={`chip${i.published ? ' on' : ''}`} onClick={() => flip(i, 'published')} aria-pressed={i.published}>
                  {i.published ? 'Published' : 'Draft (hidden)'}
                </button>
              </div>
            </div>
            <div className="admin-actions">
              <Link to={`/admin/learning/${i.id}`} className="btn btn-outline btn-small">View</Link>
              <button className="btn btn-outline btn-small" onClick={() => { setNotice(''); setEditing(i); }}>Edit</button>
              <button className="btn btn-danger btn-small" onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
