'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './ui';

const NAV = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/study', label: 'Study', icon: 'book' },
  { href: '/subjects', label: 'Subjects', icon: 'folder' },
  { href: '/exams', label: 'Exams', icon: 'calendar' },
  { href: '/stats', label: 'Stats', icon: 'chart' },
];

const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  // Register the service worker (needed for push notifications and "install to home screen").
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  // Coming back to the app after a while (or after midnight) should show fresh data.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) router.refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [router]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/icons/icon-192.png" alt="" width={30} height={30} style={{ borderRadius: 9 }} />
          Tracker
        </div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`side-link ${isOn(path, n.href) ? 'on' : ''}`}>
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <Link href="/settings" className={`side-link ${isOn(path, '/settings') ? 'on' : ''}`}>
          <Icon name="gear" />
          Settings
        </Link>
      </aside>

      <div>
        <main className="main">
          <div className="topbar">
            <Link href="/" className="row" style={{ gap: 8 }} aria-label="Home">
              <img src="/icons/icon-192.png" alt="" width={26} height={26} style={{ borderRadius: 8 }} />
              <span className="brand">Tracker</span>
            </Link>
            <Link href="/settings" className="btn ghost icon gear" aria-label="Settings">
              <Icon name="gear" />
            </Link>
          </div>
          {children}
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`tab ${isOn(path, n.href) ? 'on' : ''}`} aria-current={isOn(path, n.href) ? 'page' : undefined}>
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
