import { NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/profile-api';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { assertProfileStorageAvailable } from '@/lib/profile-store';
import { currentCloudSession, cloudStorageConfigured, createCloudUploadToken } from '@/lib/supabase-rest';

export async function POST(request) {
  try {
    const proxied = await proxyBackendRequest(request, '/api/profiles/upload-token');
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in before uploading a resume.' }, { status: 401 });
      const upload = await createCloudUploadToken(session, await request.json());
      return NextResponse.json({ success: true, ...upload }, { headers: { 'Cache-Control': 'no-store' } });
    }
    assertProfileStorageAvailable();
    return NextResponse.json({ success: false, error: 'Signed uploads are enabled for the configured Vercel storage service.' }, { status: 503 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
