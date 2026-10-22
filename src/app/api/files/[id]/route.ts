import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { isAuthed } from '@/lib/auth';
import { BLOB_ACCESS } from '@/lib/blob';

export const dynamic = 'force-dynamic';

const INLINE = /^(application\/pdf|image\/(png|jpe?g|gif|webp)|text\/plain)/;

// Streams a private file to the logged-in owner. ?download=1 forces a download.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const rows = await q<{ file_url: string | null; file_name: string | null }>(
    'select file_url, file_name from materials where id = $1',
    [Number(id) || 0],
  );
  const row = rows[0];
  if (!row?.file_url) return NextResponse.json({ error: 'No file' }, { status: 404 });

  const res = await get(row.file_url, { access: BLOB_ACCESS });
  if (!res || res.statusCode !== 200) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const forceDownload = new URL(req.url).searchParams.get('download') === '1';
  const type = res.blob.contentType || 'application/octet-stream';
  const disposition = !forceDownload && INLINE.test(type) ? 'inline' : 'attachment';
  const name = encodeURIComponent(row.file_name || 'file');
  return new Response(res.stream, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${name}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
