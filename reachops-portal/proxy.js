import { NextResponse } from 'next/server';
import { getSupabaseConfig } from './lib/supabase-config';

function apiPath(pathname) {
  return pathname.startsWith('/api/');
}

function clearSession(response) {
  for (const name of ['reachops_access_token', 'reachops_refresh_token']) {
    response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  }
  return response;
}

function unauthorized(request) {
  if (apiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ success: false, error: 'Please sign in to continue.' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next();

  const accessToken = request.cookies.get('reachops_access_token')?.value;
  const refreshToken = request.cookies.get('reachops_refresh_token')?.value;
  if (!accessToken && !refreshToken) return unauthorized(request);

  const headers = { apikey: config.key, 'Content-Type': 'application/json' };
  if (accessToken) {
    const userResponse = await fetch(`${config.url}/auth/v1/user`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` }, cache: 'no-store'
    }).catch(() => null);
    if (userResponse?.ok) return NextResponse.next();
  }

  if (refreshToken) {
    const refreshResponse = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers,
      body: JSON.stringify({ refresh_token: refreshToken }), cache: 'no-store'
    }).catch(() => null);
    if (refreshResponse?.ok) {
      const session = await refreshResponse.json();
      const response = NextResponse.next();
      const common = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
      response.cookies.set('reachops_access_token', session.access_token, { ...common, maxAge: Math.min(Number(session.expires_in) || 3600, 60 * 60 * 24 * 7) });
      response.cookies.set('reachops_refresh_token', session.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
      return response;
    }
  }
  return clearSession(unauthorized(request));
}

export const config = {
  matcher: ['/upload/:path*', '/submissions/:path*', '/api/profiles/:path*', '/api/candidates', '/api/upload']
};
