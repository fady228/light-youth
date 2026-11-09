import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const links: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/devotions', label: 'Devotions' },
  { to: '/learning', label: 'Learning' },
  { to: '/profile', label: 'Profile' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand">
            <span aria-hidden>💡</span> Light Youth
          </NavLink>
          <nav className="nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
                {l.label}
              </NavLink>
            ))}
            <button
              className="nav-link"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}
