import { api } from '../api';
import { useFetch } from '../hooks';

export default function Leaderboard() {
  const { data, loading, error } = useFetch(() => api.leaderboard());
  return (
    <>
      <h1 className="display">Leaderboard 🏆</h1>
      <p className="lead">Who's winning summer? Gifts at the end of the season! 🎁</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      <ol className="board">
        {data?.map((r) => (
          <li key={r.id} className={r.isMe ? 'me' : ''}>
            <span className="rank">{r.rank}</span>
            <span className="name">
              {r.avatarEmoji} {r.displayName}{r.isMe && " (that's you!)"}
            </span>
            <span className="pts">{r.points} pts</span>
          </li>
        ))}
      </ol>
    </>
  );
}
