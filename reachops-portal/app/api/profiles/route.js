import { NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/profile-api';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { currentCloudSession, cloudStorageConfigured, listCloudProfiles, createCloudProfile, registerCloudProfile } from '@/lib/supabase-rest';
import {
  assertProfileStorageAvailable,
  createProfile,
  listProfiles
} from '@/lib/profile-store';

export async function GET(request) {
  try {
    const proxied = await proxyBackendRequest(request, '/api/profiles');
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in to view candidate profiles.' }, { status: 401 });
      return NextResponse.json({ success: true, profiles: await listCloudProfiles(session) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    assertProfileStorageAvailable();
    return NextResponse.json({ success: true, profiles: await listProfiles() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const proxied = await proxyBackendRequest(request, '/api/profiles');
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in before saving a profile.' }, { status: 401 });
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        const profile = await registerCloudProfile(session, body.fields, body.upload);
        return NextResponse.json({ success: true, profile, message: 'Candidate profile and private resume saved.' }, { status: 201 });
      }
      const formData = await request.formData();
      const resume = formData.get('resume');
      const fields = Object.fromEntries(
        [...formData.entries()]
          .filter(([key, value]) => key !== 'resume' && typeof value === 'string')
          .map(([key, value]) => [key, value.trim()])
      );
      const profile = await createCloudProfile(session, fields, resume);
      return NextResponse.json({ success: true, profile, message: 'Candidate profile and private resume saved.' }, { status: 201 });
    }
    assertProfileStorageAvailable();
    const formData = await request.formData();
    const resume = formData.get('resume');
    const fields = Object.fromEntries(
      [...formData.entries()]
        .filter(([key, value]) => key !== 'resume' && typeof value === 'string')
        .map(([key, value]) => [key, value.trim()])
    );
    const profile = await createProfile(fields, resume);
    return NextResponse.json({ success: true, profile, message: 'Candidate profile and resume saved in the local workspace.' }, { status: 201 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
