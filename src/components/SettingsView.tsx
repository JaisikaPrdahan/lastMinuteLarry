'use client';
import { useEffect, useState } from 'react';
import type { ReminderKey, Settings } from '@/lib/types';
import { saveSettings, seedStarter } from '@/lib/actions';
import { Err, Seg, useRun } from './ui';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const REMINDER_LABELS: Record<ReminderKey, { title: string; hint: string }> = {
  study: { title: 'Study nudge', hint: 'If no study is logged by then' },
  gym: { title: 'Gym check-in', hint: 'If you have not checked in' },
  dsa: { title: 'DSA practice', hint: 'If no DSA is logged' },
  breakfast: { title: 'Breakfast check-in', hint: 'If not logged' },
  lunch: { title: 'Lunch check-in', hint: 'If not logged' },
  dinner: { title: 'Dinner check-in', hint: 'If not logged' },
  exams: { title: 'Exam countdown', hint: '7, 3 and 1 days before, and on the day' },
};

export default function SettingsView({ settings, tz, subjectCount }: { settings: Settings; tz: string; subjectCount: number }) {
  const { pending, error, run } = useRun();
  const [saved, setSaved] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');

  const [f, setF] = useState({
    weekdayHours: String(settings.weekdayHours),
    weekendHours: String(settings.weekendHours),
    minPerPpt: String(settings.minPerPpt),
    minPerProgram: String(settings.minPerProgram),
    minPerOther: String(settings.minPerOther),
    studyTarget: String(settings.studyTarget),
    gymTarget: String(settings.gymTarget),
    dsaTarget: String(settings.dsaTarget),
  });
  const [weekStart, setWeekStart] = useState<0 | 1>(settings.weekStart);
  const [reminders, setReminders] = useState(settings.reminders);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: e.target.value }));
  };

  useEffect(() => {
    try {
      const t = localStorage.getItem('theme');
      setTheme(t === 'light' || t === 'dark' ? t : 'auto');
    } catch {}
  }, []);

  function applyTheme(t: 'auto' | 'light' | 'dark') {
    setTheme(t);
    try {
      if (t === 'auto') {
        localStorage.removeItem('theme');
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem('theme', t);
        document.documentElement.dataset.theme = t;
      }
    } catch {}
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        saveSettings({
          weekdayHours: Number(f.weekdayHours),
          weekendHours: Number(f.weekendHours),
          minPerPpt: Number(f.minPerPpt),
          minPerProgram: Number(f.minPerProgram),
          minPerOther: Number(f.minPerOther),
          studyTarget: Number(f.studyTarget),
          gymTarget: Number(f.gymTarget),
          dsaTarget: Number(f.dsaTarget),
          weekStart,
          reminders,
        }),
      () => setSaved(true),
    );
  }

  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 14 }}>Settings</h1>

      <form onSubmit={save} className="stack">
        <section className="card col gap-l">
          <div>
            <h2>Study time</h2>
            <p className="small muted">Used to rank your exams and build today’s plan. These are starting values: set your real ones.</p>
          </div>
          <div className="grid two">
            <Num label="Hours per weekday" value={f.weekdayHours} onChange={set('weekdayHours')} step="0.25" max={18} />
            <Num label="Hours per weekend day" value={f.weekendHours} onChange={set('weekendHours')} step="0.25" max={18} />
          </div>
          <div className="grid three">
            <Num label="Minutes per PPT" value={f.minPerPpt} onChange={set('minPerPpt')} max={600} />
            <Num label="Minutes per program" value={f.minPerProgram} onChange={set('minPerProgram')} max={600} />
            <Num label="Minutes per other" value={f.minPerOther} onChange={set('minPerOther')} max={600} />
          </div>
          <p className="tiny muted">You can override the minutes for any single unit from its edit screen.</p>
        </section>

        <section className="card col gap-l">
          <h2>Weekly goals</h2>
          <div className="grid three">
            <Num label="Study days" value={f.studyTarget} onChange={set('studyTarget')} max={7} />
            <Num label="Gym days" value={f.gymTarget} onChange={set('gymTarget')} max={7} />
            <Num label="DSA days" value={f.dsaTarget} onChange={set('dsaTarget')} max={7} />
          </div>
          <div className="col gap-s">
            <span className="small strong muted">Week starts on</span>
            <div>
              <Seg
                value={weekStart}
                onChange={(v) => {
                  setSaved(false);
                  setWeekStart(v);
                }}
                options={[
                  { value: 1, label: 'Monday' },
                  { value: 0, label: 'Sunday' },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="card col gap-l">
          <div>
            <h2>Reminders</h2>
            <p className="small muted">Times are in {tz}. A reminder only fires if you haven’t already logged that item today.</p>
          </div>
          <div className="list">
            {(Object.keys(REMINDER_LABELS) as ReminderKey[]).map((k) => (
              <div key={k} className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="strong">{REMINDER_LABELS[k].title}</p>
                  <p className="tiny muted">{REMINDER_LABELS[k].hint}</p>
                </div>
                <input
                  className="input"
                  style={{ width: 118 }}
                  type="time"
                  value={reminders[k].time}
                  onChange={(e) => {
                    setSaved(false);
                    setReminders((r) => ({ ...r, [k]: { ...r[k], time: e.target.value || r[k].time } }));
                  }}
                  aria-label={`${REMINDER_LABELS[k].title} time`}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminders[k].on}
                  aria-label={`${REMINDER_LABELS[k].title} on or off`}
                  className={`check ${reminders[k].on ? 'on' : ''}`}
                  onClick={() => {
                    setSaved(false);
                    setReminders((r) => ({ ...r, [k]: { ...r[k], on: !r[k].on } }));
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="row" style={{ position: 'sticky', bottom: 'calc(80px + env(safe-area-inset-bottom))', zIndex: 5 }}>
          <button className="btn primary block" disabled={pending}>
            {pending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
        {saved && <p className="ok center">Saved.</p>}
        <Err>{error}</Err>
      </form>

      <Notifications />

      <section className="card col gap-l">
        <h2>Appearance</h2>
        <div>
          <Seg
            value={theme}
            onChange={applyTheme}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
      </section>

      <section className="card col gap-l">
        <div>
          <h2>Starter subjects</h2>
          <p className="small muted">Adds FACD (20 PPTs), WSMA (4 PPTs + 16 programs), SE (8 PPTs) and PCAP (6 PPTs + 40 programs) as units in an “Unsorted” chapter. Subjects that already exist are skipped.</p>
        </div>
        <div className="row">
          <button
            className="btn"
            disabled={pending}
            onClick={() => run(() => seedStarter(), (r) => setSeedMsg(r.n ? `Added ${r.n} subject${r.n === 1 ? '' : 's'}.` : 'They are already there.'))}
          >
            Add starter subjects
          </button>
          {seedMsg && <span className="small ok">{seedMsg}</span>}
        </div>
        <p className="tiny muted">You currently have {subjectCount} subject{subjectCount === 1 ? '' : 's'}.</p>
      </section>

      <section className="card col gap-l">
        <h2>Account</h2>
        <p className="small muted">The password is set in your Vercel environment variables (APP_PASSWORD). Change it there and redeploy.</p>
        <div>
          <button className="btn danger" onClick={signOut}>
            Sign out of this device
          </button>
        </div>
      </section>
    </div>
  );
}

function Num({ label, value, onChange, step = '1', max }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string; max: number }) {
  return (
    <label className="field">
      {label}
      <input className="input" type="number" inputMode="decimal" min={0} max={max} step={step} value={value} onChange={onChange} required />
    </label>
  );
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushStatus = 'loading' | 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

function Notifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setStatus('unsupported');
      if (!VAPID) return setStatus('unconfigured');
      if (Notification.permission === 'denied') return setStatus('denied');
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        setStatus((await reg.pushManager.getSubscription()) ? 'on' : 'off');
      } catch {
        setStatus('unsupported');
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID!) });
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error('Server rejected the subscription');
      setStatus('on');
      setMsg('Notifications are on for this device.');
    } catch (e) {
      setMsg((e as Error).message || 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus('off');
      setMsg('');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: number };
      setMsg(res.ok && j.ok ? 'Sent. It should arrive in a few seconds.' : j.error || 'Nothing was delivered. Try turning notifications off and on again.');
    } catch {
      setMsg('Network problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card col gap-l">
      <div>
        <h2>Push notifications</h2>
        <p className="small muted">Enable this on each device you want reminders on (phone and laptop).</p>
      </div>
      {status === 'loading' && <p className="small muted">Checking…</p>}
      {status === 'unsupported' && (
        <p className="small">
          This browser can’t do push notifications. On iPhone, tap Share → <strong>Add to Home Screen</strong>, open the app from its icon, then come back here (needs iOS 16.4 or later).
        </p>
      )}
      {status === 'unconfigured' && <p className="small">Push isn’t configured yet: add the VAPID keys in your Vercel environment variables and redeploy (see the README).</p>}
      {status === 'denied' && <p className="small">Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.</p>}
      {status === 'off' && (
        <div>
          <button className="btn primary" onClick={enable} disabled={busy}>
            Enable on this device
          </button>
        </div>
      )}
      {status === 'on' && (
        <div className="row wrap">
          <span className="badge good">On for this device</span>
          <button className="btn small" onClick={test} disabled={busy}>
            Send test
          </button>
          <button className="btn small danger" onClick={disable} disabled={busy}>
            Turn off
          </button>
        </div>
      )}
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
