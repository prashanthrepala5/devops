'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [configured, setConfigured] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => { setConfigured(data.configured); setAuthenticated(Boolean(data.authenticated)); })
      .catch(() => setConfigured(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not authenticate.');
      if (data.authenticated) {
        const next = new URLSearchParams(window.location.search).get('next');
        const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/upload';
        router.replace(safeNext);
        router.refresh();
      } else setMessage(data.message || 'Check your email to continue.');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setMessage('You have signed out.');
  }

  return (
    <section className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>REACHOPS ACCOUNT</div>
        <h1>{authenticated ? 'You’re signed in' : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className={styles.subtitle}>Your candidate profiles and resumes are private to your account.</p>

        {configured === false && <div className={styles.notice} role="alert"><strong>Finish Supabase setup first</strong><span>Add the Supabase project URL and publishable key to the Vercel environment, then redeploy.</span></div>}
        {authenticated ? (
          <div className={styles.signedIn}>
            <p>Your account is ready.</p>
            <Link className={styles.primary} href="/upload">Open profile uploads</Link>
            <Link className={styles.secondary} href="/submissions">View my profiles</Link>
            <button className={styles.textButton} type="button" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <label>Email address<input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label>Password<input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /><span>Use at least 8 characters.</span></label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {message && <p className={styles.success} role="status">{message}</p>}
            <button className={styles.primary} type="submit" disabled={busy || configured === false}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
            <button className={styles.textButton} type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>
              {mode === 'signin' ? 'New to ReachOps? Create an account' : 'Already have an account? Sign in'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
