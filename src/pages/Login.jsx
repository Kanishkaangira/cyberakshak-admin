import { useState } from 'react';
import { useAuth } from '../auth';

export default function Login() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    await signIn(email.trim(), password);
    setBusy(false);
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
            <path d="M8.5 12l2.5 2.5L15.5 10" />
          </svg>
        </div>
        <h1>CyberAkshak Admin</h1>
        <p className="muted">Sign in with an administrator account.</p>

        <label className="field">
          <span className="label">Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {authError && <div className="banner error" role="alert">{authError}</div>}

        <button className="btn primary wide" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
