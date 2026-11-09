import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import LearningReader from '../components/LearningReader';
import { useFetch } from '../hooks';

export default function LearningDetail() {
  const { id = '' } = useParams();
  const { data, loading, error, setData } = useFetch(() => api.learningItem(id), [id]);

  if (loading && !data) return <p className="muted">Loading…</p>;
  if (error || !data) return <p className="error">{error || 'Not found.'}</p>;

  const toggle = async () => {
    const next = !data.saved;
    setData({ ...data, saved: next });
    try {
      await api.setSaved(data.id, next);
    } catch {
      setData(data);
    }
  };

  return (
    <div className="article-wrap">
      <Link to="/learning" className="back">← All learning</Link>
      <LearningReader
        item={data}
        links
        actions={
          <button className={`btn btn-outline btn-small${data.saved ? ' on' : ''}`} onClick={toggle} aria-pressed={data.saved}>
            {data.saved ? '🔖 Saved' : '🏷️ Save for later'}
          </button>
        }
      />
    </div>
  );
}
