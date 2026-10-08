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
      <section className="login-card" aria-label="Cyberakshak Admin Panel sign in">
        <div className="login-brand-panel">
          <div className="login-brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 4.5 40 10v12.3c0 10-6.4 17.5-16 21.2C14.4 39.8 8 32.3 8 22.3V10l16-5.5Z" />
                <path d="m17.5 24.2 4.4 4.4 9.2-9.2" />
                <path d="M24 12v4m-8 5h-3m22 0h-3" />
              </svg>
            </div>
            <span>CYBERAKSHAK</span>
          </div>
          <div className="login-brand-copy">
            <span className="login-overline">SECURITY • AWARENESS • ACTION</span>
            <h2>Your events.<br />One secure place.</h2>
            <p>Manage cybersecurity awareness events and keep your community informed.</p>
          </div>
          <div className="login-brand-footer">
            <span className="login-status-dot" aria-hidden="true" />
            Secure administrator access
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <span className="login-form-kicker">ADMINISTRATOR PORTAL</span>
          <h1>Cyberakshak<br className="login-title-break" /> Admin Panel</h1>
          <p className="login-intro">Sign in with your administrator account to continue.</p>

          <label className="field">
            <span className="label">Email address</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </label>

          {authError && <div className="banner error" role="alert">{authError}</div>}

          <button className="btn primary wide" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to dashboard'}
          </button>
          <p className="login-security-note">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5 13 3.3v3.9c0 3.1-2 5.4-5 6.6-3-1.2-5-3.5-5-6.6V3.3L8 1.5Z" />
              <path d="m5.8 7.7 1.5 1.5 3-3" />
            </svg>
            Protected sign-in for authorized administrators
          </p>
        </form>
      </section>
    </main>
  );
}
