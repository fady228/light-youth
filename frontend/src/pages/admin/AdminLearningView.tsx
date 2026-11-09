import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { LearningForm, toInput } from '../../components/admin/LearningForm';
import LearningReader from '../../components/LearningReader';
import { useFetch } from '../../hooks';

/** Reading view of a learning item for admins: exactly what youth see, even for drafts. */
export default function AdminLearningView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: item, loading, error, reload } = useFetch(() => api.adminLearningItem(id), [id]);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');

  if (loading && !item) return <p className="muted">Loading…</p>;
  if (error || !item) return <p className="error">{error || 'Not found.'}</p>;

  if (editing) {
    return (
      <LearningForm
        initial={toInput(item)}
        id={item.id}
        onDone={() => {
          setEditing(false);
          setNotice('Changes saved.');
          reload();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const remove = async () => {
    const extra = item.type === 'sermon' ? ' Its PDF will be deleted too.' : '';
    if (!window.confirm(`Delete "${item.title}"?${extra} It will also disappear from users' saved lists.`)) return;
    try {
      await api.deleteLearning(item.id);
      navigate('/admin/learning');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const toggle = async (field: 'published' | 'featured') => {
    setMsg('');
    try {
      await api.updateLearning(item.id, { [field]: !item[field] });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <>
      <Link to="/admin/learning" className="back">← All learning</Link>
      <div className="row-between view-bar">
        <div className="chips">
          <button className={`chip${item.published ? ' on' : ''}`} onClick={() => toggle('published')} aria-pressed={item.published}>
            {item.published ? 'Published' : 'Draft (hidden from youth)'}
          </button>
          <button className={`chip${item.featured ? ' on' : ''}`} onClick={() => toggle('featured')} aria-pressed={item.featured}>
            {item.featured ? '★ Featured' : '☆ Not featured'}
          </button>
        </div>
        <div className="admin-actions">
          <button className="btn btn-outline btn-small" onClick={() => { setNotice(''); setEditing(true); }}>Edit</button>
          <button className="btn btn-danger btn-small" onClick={remove}>Delete</button>
        </div>
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {msg && <p className="error">{msg}</p>}

      <div className="article-wrap">
        <LearningReader item={item} />
      </div>
    </>
  );
}
