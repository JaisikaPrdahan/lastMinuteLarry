'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card col">
      <h2>Couldn’t load your data</h2>
      <p className="muted">
        This is usually a database problem: check that <code>DATABASE_URL</code> is set on Vercel and that you ran{' '}
        <code>npm run db:init</code> once.
      </p>
      {process.env.NODE_ENV !== 'production' && <pre className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>}
      <div>
        <button className="btn primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
