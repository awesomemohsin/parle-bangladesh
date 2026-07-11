import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const disallowedExtensions = ['html', 'htm', 'svg', 'js', 'ts', 'jsx', 'tsx', 'sh', 'bash', 'exe', 'bat'];
    if (ext && disallowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Disallowed file type: upload of HTML, SVG, or executable scripts is prohibited.' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[BlobUpload] BLOB_READ_WRITE_TOKEN is missing');
      return NextResponse.json({ error: 'Configuration error: Blob token missing' }, { status: 500 });
    }

    // Upload to Vercel Blob using current standard token
    const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      token: token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('[BlobUpload] Error uploading file:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
