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
      <section className="login-layout" aria-label="Cyberakshak Admin Panel">
        <aside className="login-showcase">
          <div className="showcase-brand">
            <div className="showcase-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 3.5 27 7.5v8.2c0 6.2-4.4 10.8-11 13.3C9.4 26.5 5 21.9 5 15.7V7.5l11-4Z" />
                <path d="m11.5 15.8 3 3 6-6" />
              </svg>
            </div>
            <span>CYBERAKSHAK</span>
          </div>

          <div className="showcase-copy">
            <span className="showcase-kicker"><i /> ADMINISTRATOR WORKSPACE</span>
            <h1>Cyberakshak<br /><span>Admin Panel</span></h1>
            <p>Manage cybersecurity awareness events and keep your community informed from one secure workspace.</p>
          </div>

          <div className="showcase-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-orbit orbit-three" />
            <div className="art-shield">
              <svg viewBox="0 0 96 96" fill="none">
                <path d="M48 10 77 20v22c0 17-11.6 29.8-29 37-17.4-7.2-29-20-29-37V20l29-10Z" />
                <path d="m35 46 9 9 18-18" />
              </svg>
            </div>
            <div className="art-chip chip-top"><span /> EVENTS <strong>MANAGEMENT</strong></div>
            <div className="art-chip chip-bottom"><span /> COMMUNITY <strong>SAFETY</strong></div>
          </div>

          <div className="showcase-footer">
            <span className="showcase-live-dot" />
            A safer digital community starts here
          </div>
        </aside>

        <form className="login-card" onSubmit={submit}>
          <div className="login-heading">
            <span className="login-form-kicker">ADMINISTRATOR SIGN IN</span>
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your dashboard.</p>
          </div>

          <label className="field">
            <span className="label">Email address</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </label>

          {authError && <div className="banner error" role="alert">{authError}</div>}

          <button className="btn primary wide" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to dashboard'}
            {!busy && <span className="login-button-arrow" aria-hidden="true">→</span>}
          </button>
          <div className="login-secure-label">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5 13 3.3v3.9c0 3.1-2 5.4-5 6.6-3-1.2-5-3.5-5-6.6V3.3L8 1.5Z" />
              <path d="m5.8 7.7 1.5 1.5 3-3" />
            </svg>
            Your administrator session is protected
          </div>
        </form>
      </section>
    </main>
  );
}
