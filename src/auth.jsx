import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | signedOut | ready
  const [authError, setAuthError] = useState('');

  // 1) Track the Supabase session (keep this callback synchronous).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setStatus('signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setStatus('signedOut');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) Verify every signed-in user against the admins allowlist.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        if (error) console.error('[admin auth] admins lookup failed:', error);
        setAuthError(error ? error.message : 'Access denied: this account is not an administrator.');
        await supabase.auth.signOut();
        return;
      }
      setAuthError('');
      setProfile({ ...data, full_name: 'Administrator' });
      setStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (email, password) => {
    setAuthError('');
    // Ask the database first: non-admin emails are refused without ever being signed in.
    const normalizedEmail = email.trim().toLowerCase();
    const { data: allowed, error: checkError } = await supabase.rpc('can_login_admin', { email: normalizedEmail });
    if (checkError) {
      console.error('[admin auth] can_login_admin failed:', checkError);
      setAuthError(checkError.message || 'Could not verify your account. Please try again.');
      return false;
    }
    if (allowed !== true) {
      setAuthError('Access denied: this account is not an administrator.');
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      setAuthError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = useMemo(
    () => ({ session, profile, status, authError, signIn, signOut }),
    [session, profile, status, authError, signIn, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
