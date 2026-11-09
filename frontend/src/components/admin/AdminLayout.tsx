import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin-theme">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/admin" className="brand">Light Youth</NavLink>
          <nav className="nav" aria-label="Admin">
            <NavLink to="/admin" end className="nav-link">Home</NavLink>
            <NavLink to="/admin/devotions" className="nav-link">Devotions</NavLink>
            <NavLink to="/admin/learning" className="nav-link">Learning</NavLink>
            <button
              className="nav-link"
              onClick={() => {
                logout();
                navigate('/admin/login');
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
    </div>
  );
}
