import { NextResponse } from 'next/server';

/**
 * Forward a same-origin portal API request to the separately deployed Node API.
 * The base URL is server-only; callers must still enforce authentication and
 * resource ownership in the backend service.
 */
export async function proxyBackendRequest(request, apiPath) {
  const configuredBase = process.env.REACHOPS_API_BASE_URL;
  if (!configuredBase) return null;

  try {
    const base = new URL(configuredBase);
    if (base.username || base.password || (process.env.VERCEL && base.protocol !== 'https:')) {
      throw new Error('Invalid backend URL configuration.');
    }

    const target = new URL(`${apiPath}${new URL(request.url).search}`, base);
    const headers = new Headers();
    for (const key of ['accept', 'content-type', 'authorization', 'cookie', 'x-csrf-token']) {
      const value = request.headers.get(key);
      if (value) headers.set(key, value);
    }

    const method = request.method.toUpperCase();
    const body = ['GET', 'HEAD'].includes(method) ? undefined : Buffer.from(await request.arrayBuffer());
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual'
    });

    const responseHeaders = new Headers();
    for (const key of ['content-type', 'cache-control', 'retry-after']) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({
      success: false,
      setupRequired: true,
      error: 'The configured profile backend could not be reached. Check REACHOPS_API_BASE_URL and the backend service.'
    }, { status: 502 });
  }
}
