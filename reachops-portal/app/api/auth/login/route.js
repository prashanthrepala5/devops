import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase-config';

function setSession(response, session) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.min(Number(session.expires_in) || 3600, 60 * 60 * 24 * 7)
  };
  response.cookies.set('reachops_access_token', session.access_token, options);
  response.cookies.set('reachops_refresh_token', session.refresh_token, {
    ...options,
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function POST(request) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ success: false, error: 'Supabase is not configured for this deployment yet.' }, { status: 503 });
  try {
    const { email, password, mode } = await request.json();
    if (!email || !password || String(password).length < 8) {
      return NextResponse.json({ success: false, error: 'Enter a valid email and a password with at least 8 characters.' }, { status: 400 });
    }
    const isSignUp = mode === 'signup';
    const endpoint = isSignUp ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
    const upstream = await fetch(`${config.url}${endpoint}`, {
      method: 'POST',
      headers: { apikey: config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json({ success: false, error: data.msg || data.message || data.error_description || 'Authentication failed.' }, { status: upstream.status });
    }
    const response = NextResponse.json({
      success: true,
      authenticated: Boolean(data.access_token && data.refresh_token),
      confirmationRequired: isSignUp && !data.access_token,
      message: isSignUp && !data.access_token ? 'Check your email to confirm your account, then sign in.' : 'Signed in.'
    });
    if (data.access_token && data.refresh_token) setSession(response, data);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach the authentication service. Check the Supabase project settings.' }, { status: 502 });
  }
}
