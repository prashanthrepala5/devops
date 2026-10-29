import { NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/profile-api';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { currentCloudSession, cloudStorageConfigured, createCloudProfile } from '@/lib/supabase-rest';
import { assertProfileStorageAvailable, createProfile } from '@/lib/profile-store';

export async function POST(request) {
  try {
    const proxied = await proxyBackendRequest(request, '/api/profiles');
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in before saving a profile.' }, { status: 401 });
      const formData = await request.formData();
      const file = formData.get('resume');
      const fields = Object.fromEntries(
        [...formData.entries()]
          .filter(([key, value]) => key !== 'resume' && typeof value === 'string')
          .map(([key, value]) => [key, value.trim()])
      );
      const profile = await createCloudProfile(session, fields, file);
      return NextResponse.json({ success: true, profile, filename: profile.resumeName, message: 'Candidate profile and private resume saved.' }, { status: 201 });
    }
    assertProfileStorageAvailable();
    const formData = await request.formData();
    const file = formData.get('resume');
    const fields = Object.fromEntries(
      [...formData.entries()]
        .filter(([key, value]) => key !== 'resume' && typeof value === 'string')
        .map(([key, value]) => [key, value.trim()])
    );
    const profile = await createProfile(fields, file);
    return NextResponse.json({ success: true, profile, filename: profile.resumeName, message: 'Candidate profile and resume saved in the local workspace.' }, { status: 201 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
