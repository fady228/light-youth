import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { emptyLearning, LearningForm } from '../../components/admin/LearningForm';
import { nextFreeDate, todayStr } from '../../components/admin/dates';
import { DevotionForm } from '../../components/admin/DevotionForm';
import { useFetch } from '../../hooks';

export default function AdminHome() {
  const { user } = useAuth();
  const devotions = useFetch(() => api.adminDevotions());
  const learning = useFetch(() => api.adminLearning());
  const [mode, setMode] = useState<'devotion' | 'learning' | null>(null);
  const [notice, setNotice] = useState('');

  const taken = devotions.data?.map((d) => d.publishDate) ?? [];
  const todays = devotions.data?.find((d) => d.publishDate === todayStr());
  const todayFree = !todays;

  const done = (msg: string) => {
    setMode(null);
    setNotice(msg);
    devotions.reload();
    learning.reload();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display">Peace be with you, {user?.displayName}.</h1>

      <section className="card card-orange status-card">
        <p className="eyebrow">Today's devotion</p>
        {devotions.loading && !devotions.data ? (
          <h2>Checking…</h2>
        ) : todays ? (
          <>
            <h2>{todays.title}</h2>
            <p className="status-line">
              {todays.passageRef} · {todays.questions.length} question{todays.questions.length === 1 ? '' : 's'} ·{' '}
              <Link to="/admin/devotions" className="link">Edit</Link>
            </p>
          </>
        ) : (
          <>
            <h2>Not posted yet</h2>
            <p className="status-line">Add it below so everyone can start today's reading.</p>
          </>
        )}
      </section>

      {notice && <p className="notice" role="status">{notice}</p>}
      {devotions.error && <p className="error">{devotions.error}</p>}

      {mode === null && (
        <>
          <div className="grid-2 action-grid">
            <button className="card action-card" onClick={() => setMode('devotion')} disabled={!devotions.data}>
              <h2>{todayFree ? "Add today's devotion" : 'Add a devotion'}</h2>
              <p className="muted">
                {todayFree
                  ? 'Write the reading and its questions.'
                  : "Today's is posted. Schedule the next one."}
              </p>
            </button>
            <button className="card action-card" onClick={() => setMode('learning')}>
              <h2>Add learning</h2>
              <p className="muted">Share an article, a video or a sermon PDF.</p>
            </button>
          </div>
          <p className="muted counts">
            {devotions.data ? `${devotions.data.length} devotion${devotions.data.length === 1 ? '' : 's'}` : '…'}
            {' · '}
            {learning.data ? `${learning.data.length} learning item${learning.data.length === 1 ? '' : 's'}` : '…'}
          </p>
        </>
      )}

      {mode === 'devotion' && (
        <DevotionForm
          existing={null}
          takenDates={taken}
          defaultDate={nextFreeDate(taken)}
          onDone={() => done('Devotion published.')}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'learning' && (
        <LearningForm initial={emptyLearning} id={null} onDone={() => done('Saved.')} onCancel={() => setMode(null)} />
      )}
    </>
  );
}
