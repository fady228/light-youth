import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth';

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-theme">
      <div className="auth-wrap">
        <div className="auth">
          <p className="eyebrow">Youth ministry · Admin</p>
          <h1 className="auth-title">Light Youth</h1>
          <p className="auth-sub">Post devotions and blogs, and keep the content fresh.</p>

          {user ? (
            <div className="auth-form">
              <p className="error" role="alert">
                {user.email} is signed in, but it isn't an admin account.
              </p>
              <button type="button" className="btn btn-outline" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <form onSubmit={submit} className="auth-form">
              <input className="input pill" type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <input className="input pill" type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn-primary" disabled={busy}>{busy ? 'One sec…' : 'Sign in'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
