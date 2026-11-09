import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function GoogleButton({ onToken, onError }: { onToken: (t: string) => void; onError: (m: string) => void }) {
  const start = useGoogleLogin({
    onSuccess: (r) => onToken(r.access_token),
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });
  return (
    <button type="button" className="btn btn-outline" onClick={() => start()}>
      Continue with Google
    </button>
  );
}

export default function Login({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(() => (isRegister ? register(name, email, password) : login(email, password)));
  };

  return (
    <div className="auth-wrap">
      <div className="auth">
        <p className="eyebrow">Youth ministry</p>
        <h1 className="auth-title">Light Youth</h1>
        <p className="auth-sub">Daily devotions, blogs, and points — let's make this summer count. 🔥</p>

        <form onSubmit={onSubmit} className="auth-form">
          {isRegister && (
            <input
              className="input pill"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
              autoComplete="name"
            />
          )}
          <input
            className="input pill"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="input pill"
            type="password"
            placeholder={isRegister ? 'Password (8+ characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isRegister ? 8 : undefined}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'One sec…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
          {GOOGLE_CLIENT_ID && (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleButton onToken={(t) => run(() => loginWithGoogle(t))} onError={setError} />
            </GoogleOAuthProvider>
          )}
        </form>

        <p className="auth-foot">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
