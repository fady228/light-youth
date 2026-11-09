import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import LearningCard from '../components/LearningCard';
import { useFetch } from '../hooks';

export default function Home() {
  const { user } = useAuth();
  const today = useFetch(() => api.todayDevotion());
  const featured = useFetch(() => api.learning({ featured: true }));
  if (!user) return null;

  const next = user.nextReward;
  const pct = next ? Math.min(100, (user.points / next.pointsRequired) * 100) : 100;
  const devotion = today.data?.devotion;

  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display">Hey {user.displayName}! 👋</h1>

      <div className="grid-home">
        <section className="card card-orange">
          <p className="eyebrow">🔥 Your summer points</p>
          <p className="big">{user.points}</p>
          {next ? (
            <>
              <p className="points-goal">
                {next.pointsRequired - user.points} pts to 🎁 {next.name}
              </p>
              <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <p className="points-goal">You've unlocked every reward. Legend! 🏆</p>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Daily streak</p>
          <p className="big orange">{user.streak}</p>
          <p className="muted">days in a row ⚡</p>
        </section>
      </div>

      <section className="card stack-card">
        <p className="eyebrow">Today's devotion 📖</p>
        {devotion ? (
          <>
            <h2>{devotion.title}</h2>
            <Link to={`/devotion/${devotion.id}`} className="link">
              {devotion.completed ? 'See your answers' : 'Read & answer the questions'} →
            </Link>
          </>
        ) : (
          <>
            <h2>No devotion posted yet</h2>
            <Link to="/devotions" className="link">Browse past devotions →</Link>
          </>
        )}
      </section>

      {devotion?.reflectionQuote && (
        <section className="card card-blue stack-card">
          <p className="eyebrow">Today's reflection 💭</p>
          <p className="quote">“{devotion.reflectionQuote}”</p>
          {devotion.reflectionAuthor && <p className="muted">— {devotion.reflectionAuthor}</p>}
        </section>
      )}

      <div className="section-head">
        <h2 className="h2">Featured learning ✨</h2>
        <Link to="/learning" className="link">All learning →</Link>
      </div>
      <div className="grid-3">
        {featured.data?.map((i) => <LearningCard key={i.id} item={i} showBadge={false} />)}
      </div>
      {featured.data?.length === 0 && <p className="muted">Nothing featured yet.</p>}
    </>
  );
}
