import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="login">
      <div className="card stack">
        <div className="col" style={{ alignItems: 'center', marginBottom: 16 }}>
          <img src="/icons/icon-192.png" alt="" width={72} height={72} />
          <h1>Tracker</h1>
          <p className="muted small">Private. Enter your password to continue.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
