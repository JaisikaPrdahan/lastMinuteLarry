import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAuthed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// The browser uploads straight to Vercel Blob (so big PPT/PDF files are not limited by the 4.5 MB
// function body cap). This route only hands out short-lived upload tokens, and only when logged in.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAuthed())) throw new Error('Not signed in');
        return { addRandomSuffix: true, maximumSizeInBytes: 150 * 1024 * 1024 };
      },
      // The app records the file in the database itself (addFile action), so nothing to do here.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
