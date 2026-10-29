import { NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/profile-api';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { currentCloudSession, cloudStorageConfigured, registerCloudResume, replaceCloudResume } from '@/lib/supabase-rest';
import { assertProfileStorageAvailable, replaceResume } from '@/lib/profile-store';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const proxied = await proxyBackendRequest(request, `/api/profiles/${encodeURIComponent(id)}/resume`);
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in before replacing a resume.' }, { status: 401 });
      if (request.headers.get('content-type')?.includes('application/json')) {
        const profile = await registerCloudResume(session, id, await request.json());
        return profile
          ? NextResponse.json({ success: true, profile, message: 'Resume replaced successfully.' })
          : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
      }
      const formData = await request.formData();
      const profile = await replaceCloudResume(session, id, formData.get('resume'));
      return profile
        ? NextResponse.json({ success: true, profile, message: 'Resume replaced successfully.' })
        : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
    }
    assertProfileStorageAvailable();
    const formData = await request.formData();
    const resume = formData.get('resume');
    const profile = await replaceResume(id, resume);
    return profile
      ? NextResponse.json({ success: true, profile, message: 'Resume replaced successfully.' })
      : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
