import { del } from '@vercel/blob';

export { BLOB_ACCESS } from './blob-access';

/** Best-effort delete; never throws (a missing token or a missing blob must not block the DB change). */
export async function deleteBlobs(urls: (string | null | undefined)[]): Promise<void> {
  const list = urls.filter((u): u is string => !!u);
  if (!list.length) return;
  try {
    await del(list);
  } catch (e) {
    console.error('blob delete failed', e);
  }
}
