import { connection, NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/profile-api';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { currentCloudSession, cloudStorageConfigured, getCloudProfile, updateCloudProfile, deleteCloudProfile } from '@/lib/supabase-rest';
import {
  assertProfileStorageAvailable,
  deleteProfile,
  getProfile,
  updateProfile
} from '@/lib/profile-store';

export async function GET(_request, { params }) {
  await connection();
  try {
    const { id } = await params;
    const proxied = await proxyBackendRequest(_request, `/api/profiles/${encodeURIComponent(id)}`);
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in to view this profile.' }, { status: 401 });
      const profile = await getCloudProfile(session, id);
      return profile
        ? NextResponse.json({ success: true, profile }, { headers: { 'Cache-Control': 'no-store' } })
        : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
    }
    assertProfileStorageAvailable();
    const profile = await getProfile(id);
    return profile
      ? NextResponse.json({ success: true, profile }, { headers: { 'Cache-Control': 'no-store' } })
      : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const proxied = await proxyBackendRequest(request, `/api/profiles/${encodeURIComponent(id)}`);
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in to edit this profile.' }, { status: 401 });
      const profile = await updateCloudProfile(session, id, await request.json());
      return profile
        ? NextResponse.json({ success: true, profile, message: 'Candidate profile updated.' })
        : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
    }
    assertProfileStorageAvailable();
    const body = await request.json();
    const profile = await updateProfile(id, body);
    return profile
      ? NextResponse.json({ success: true, profile, message: 'Candidate profile updated.' })
      : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const proxied = await proxyBackendRequest(_request, `/api/profiles/${encodeURIComponent(id)}`);
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in to delete this profile.' }, { status: 401 });
      const deleted = await deleteCloudProfile(session, id);
      return deleted
        ? NextResponse.json({ success: true, message: 'Candidate profile and private resume deleted.' })
        : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
    }
    assertProfileStorageAvailable();
    const deleted = await deleteProfile(id);
    return deleted
      ? NextResponse.json({ success: true, message: 'Candidate profile and stored resume deleted.' })
      : NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
