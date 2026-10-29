import { NextResponse } from 'next/server';
import { currentCloudSession } from '@/lib/supabase-rest';
import { getSupabaseConfig } from '@/lib/supabase-config';

export async function GET() {
  const session = await currentCloudSession();
  return NextResponse.json({
    success: true,
    configured: Boolean(getSupabaseConfig()),
    cloudUploadsEnabled: Boolean(process.env.VERCEL && getSupabaseConfig()),
    authenticated: Boolean(session),
    email: session?.user?.email || null
  });
}
