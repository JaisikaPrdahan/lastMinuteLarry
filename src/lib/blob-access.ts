/**
 * Files are uploaded as private blobs and only ever served through /api/files/[id],
 * which checks the login cookie. Set NEXT_PUBLIC_BLOB_ACCESS=public only if your
 * Blob store cannot hold private files.
 */
export const BLOB_ACCESS: 'private' | 'public' =
  process.env.NEXT_PUBLIC_BLOB_ACCESS === 'public' ? 'public' : 'private';
