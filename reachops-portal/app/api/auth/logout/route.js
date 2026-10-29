import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const name of ['reachops_access_token', 'reachops_refresh_token']) {
    response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  }
  return response;
}
