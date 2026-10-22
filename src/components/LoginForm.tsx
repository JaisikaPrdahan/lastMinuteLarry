'use client';
import { useState } from 'react';
import { Err } from './ui';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = '/'; // full load so the new cookie is used everywhere
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error || 'Could not sign in');
    } catch {
      setError('Network problem. Try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="col gap-l">
      <label className="field">
        Password
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <Err>{error}</Err>
      <button className="btn primary block" disabled={busy || !password}>
        {busy ? 'Checking…' : 'Unlock'}
      </button>
    </form>
  );
}
