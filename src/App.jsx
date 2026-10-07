import { useAuth } from './auth';
import { isConfigured } from './supabaseClient';
import { ToastProvider } from './components/ui';
import Login from './pages/Login';
import EventsPage from './pages/EventsPage';

export default function App() {
  const { status, profile, signOut } = useAuth();

  if (!isConfigured) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Supabase isn't configured</h1>
          <p className="muted">
            Copy <code>.env.example</code> to <code>.env</code>, fill in <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>.
          </p>
        </div>
      </main>
    );
  }

  if (status === 'loading') return <div className="splash">Loading…</div>;
  if (status !== 'ready') return <Login />;

  return (
    <ToastProvider>
      <div className="shell">
        <aside className="side">
          <div className="side-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
              <path d="M8.5 12l2.5 2.5L15.5 10" />
            </svg>
            <span>
              CyberAkshak <small>Admin</small>
            </span>
          </div>
          
          <div className="side-foot">
            <div className="who">
              <strong>{profile.full_name}</strong>
              <span>{profile.email}</span>
            </div>
            <button className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="main"><EventsPage /></main>
      </div>
    </ToastProvider>
  );
}
