import type { Metadata } from 'next';
import LoginHero from '@/components/LoginHero';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return <LoginHero />;
}
