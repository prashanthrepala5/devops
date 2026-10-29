import { NextResponse } from 'next/server';

export function profileErrorResponse(error) {
  if (error?.code === 'PROFILE_STORAGE_NOT_CONFIGURED') {
    return NextResponse.json({
      success: false,
      setupRequired: true,
      error: 'Connect Supabase Auth, run the ReachOps database setup SQL, and add NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your hosting environment before uploading resumes.'
    }, { status: 503 });
  }

  if (error?.code === 'PROFILE_VALIDATION') {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  if (error?.status >= 400 && error?.status < 500) {
    return NextResponse.json({ success: false, error: 'Supabase rejected this operation. Check that the ReachOps SQL policies are installed and that you are signed in.' }, { status: 502 });
  }

  // Avoid returning local paths or raw filesystem errors to the browser.
  console.error('Profile API operation failed:', error?.code || 'unknown error');
  return NextResponse.json({ success: false, error: 'Could not complete the profile operation. Check the server configuration and try again.' }, { status: 500 });
}
