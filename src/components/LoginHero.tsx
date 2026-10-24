'use client';
import { useEffect, useState } from 'react';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';
import LoginForm from './LoginForm';

export default function LoginHero() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);
  return (
    <SculptureHero
      theme={theme}
      brand="Last Minute Larry"
      navLinks={[]}
      navCta={{ label: '', href: '#' }}
      eyebrow="Private · study · gym · DSA · mess"
      headline={'Show up.\nKeep the streak.'}
      headlineAccent="Keep the streak."
      backdropText="larry"
      hint="Move across the form"
      aside={<div className="sh-login"><LoginForm /></div>}
    />
  );
}
