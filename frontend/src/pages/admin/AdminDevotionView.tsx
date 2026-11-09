import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { todayStr } from '../../components/admin/dates';
import { DevotionForm } from '../../components/admin/DevotionForm';
import ReadingCard from '../../components/ReadingCard';
import { formatDay, useFetch } from '../../hooks';

const typeLabel = { multiple_choice: 'Multiple choice', true_false: 'True or false', open: 'Your thoughts (open)' } as const;

/** Reading view of a devotion for admins: exactly what youth read, plus the answer key. Works for scheduled ones too. */
export default function AdminDevotionView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: d, loading, error, reload } = useFetch(() => api.adminDevotion(id), [id]);
  const all = useFetch(() => api.adminDevotions());
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');

  if (loading && !d) return <p className="muted">Loading…</p>;
  if (error || !d) return <p className="error">{error || 'Devotion not found.'}</p>;

  if (editing) {
    return (
      <DevotionForm
        existing={d}
        takenDates={(all.data ?? []).filter((x) => x.id !== d.id).map((x) => x.publishDate)}
        onDone={() => {
          setEditing(false);
          setNotice('Changes saved.');
          reload();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const today = todayStr();
  const when = d.publishDate > today ? 'Scheduled — hidden from youth until this date' : d.publishDate === today ? "Today's devotion" : 'Published';
  const remove = async () => {
    if (!window.confirm(`Delete "${d.title}"?\n\nThis also deletes everyone's answers to it. Points already earned are kept.`)) return;
    try {
      await api.deleteDevotion(d.id);
      navigate('/admin/devotions');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <>
      <Link to="/admin/devotions" className="back">← All devotions</Link>
      <div className="row-between view-bar">
        <p className="eyebrow">{formatDay(d.publishDate)} · {when}</p>
        <div className="admin-actions">
          <button className="btn btn-outline btn-small" onClick={() => { setNotice(''); setEditing(true); }}>Edit</button>
          <button className="btn btn-danger btn-small" onClick={remove}>Delete</button>
        </div>
      </div>
      <h1 className="display">{d.title}</h1>
      {notice && <p className="notice" role="status">{notice}</p>}
      {msg && <p className="error">{msg}</p>}

      <ReadingCard passageRef={d.passageRef} verseRef={d.verseRef} body={d.body} label="Reading" />

      {d.reflectionQuote && (
        <section className="card card-blue stack-card">
          <p className="eyebrow">Reflection 💭</p>
          <p className="quote">“{d.reflectionQuote}”</p>
          {d.reflectionAuthor && <p className="muted">— {d.reflectionAuthor}</p>}
        </section>
      )}

      <h2 className="h2">Questions 🧠</h2>
      <div className="stack">
        {d.questions.map((q) => (
          <section key={q.id} className="card question">
            <p className="eyebrow">{typeLabel[q.type]} · {q.points} pts</p>
            <h3>{q.position}. {q.prompt}</h3>
            {q.type === 'multiple_choice' && (
              <div className="options">
                {q.options?.map((o) => (
                  <div key={o} className={`option static${o === q.correctAnswer ? ' correct' : ''}`}>{o}{o === q.correctAnswer && ' ✓'}</div>
                ))}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="options">
                {['true', 'false'].map((v) => (
                  <div key={v} className={`option static${v === q.correctAnswer ? ' correct' : ''}`}>
                    {v === 'true' ? 'True' : 'False'}{v === q.correctAnswer && ' ✓'}
                  </div>
                ))}
              </div>
            )}
            {q.type === 'open' && <p className="muted">Open response. Earns full points for an answer of 20+ characters.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
