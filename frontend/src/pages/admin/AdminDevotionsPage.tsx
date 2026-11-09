import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminDevotion, api } from '../../api';
import { nextFreeDate, todayStr } from '../../components/admin/dates';
import { DevotionForm } from '../../components/admin/DevotionForm';
import { formatDay, useFetch } from '../../hooks';

export default function AdminDevotionsPage() {
  const { data, loading, error, reload } = useFetch(() => api.adminDevotions());
  const [editing, setEditing] = useState<AdminDevotion | 'new' | null>(null);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');
  const today = todayStr();

  const remove = async (d: AdminDevotion) => {
    if (!window.confirm(`Delete "${d.title}" (${d.publishDate})?\n\nThis also deletes everyone's answers to it. Points already earned are kept.`)) return;
    setMsg('');
    try {
      await api.deleteDevotion(d.id);
      setNotice('Devotion deleted.');
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (editing) {
    const taken = (data ?? []).filter((d) => editing === 'new' || d.id !== editing.id).map((d) => d.publishDate);
    return (
      <DevotionForm
        existing={editing === 'new' ? null : editing}
        takenDates={taken}
        defaultDate={editing === 'new' ? nextFreeDate(taken) : undefined}
        onDone={() => {
          setNotice(editing === 'new' ? 'Devotion published.' : 'Changes saved.');
          setEditing(null);
          reload();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <div className="row-between page-head">
        <h1 className="display">Devotions</h1>
        <button className="btn btn-primary" onClick={() => { setNotice(''); setEditing('new'); }} disabled={!data}>+ New devotion</button>
      </div>
      <p className="lead">View, edit or remove devotions. Scheduled ones stay hidden from youth until their date.</p>

      {notice && <p className="notice" role="status">{notice}</p>}
      {(error || msg) && <p className="error">{error || msg}</p>}
      {loading && !data && <p className="muted">Loading…</p>}
      {data?.length === 0 && <p className="muted">Nothing here yet. Use “New devotion” to add your first one.</p>}

      <div className="stack">
        {data?.map((d) => (
          <div key={d.id} className="card admin-row">
            <div className="admin-row-main">
              <p className="eyebrow">
                {formatDay(d.publishDate, 'short')} · {d.passageRef}
                {d.publishDate > today && <span className="badge scheduled">Scheduled</span>}
                {d.publishDate === today && <span className="badge scheduled">Today</span>}
              </p>
              <h3><Link to={`/admin/devotions/${d.id}`} className="row-link">{d.title}</Link></h3>
              <p className="muted">
                {d.questions.length} question{d.questions.length === 1 ? '' : 's'} · {d.questions.reduce((s, q) => s + q.points, 0)} pts
              </p>
            </div>
            <div className="admin-actions">
              <Link to={`/admin/devotions/${d.id}`} className="btn btn-outline btn-small">View</Link>
              <button className="btn btn-outline btn-small" onClick={() => { setNotice(''); setEditing(d); }}>Edit</button>
              <button className="btn btn-danger btn-small" onClick={() => remove(d)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
