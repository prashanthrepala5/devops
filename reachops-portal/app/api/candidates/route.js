import { NextResponse } from 'next/server';
import {
  getAllCandidates,
  getCandidateResumes
} from '@/lib/candidates';
import { assertProfileStorageAvailable, listProfiles } from '@/lib/profile-store';
import { proxyBackendRequest } from '@/lib/backend-proxy';
import { currentCloudSession, cloudStorageConfigured, listCloudProfiles } from '@/lib/supabase-rest';

/**
 * Helper to match resume filenames to candidates based on name similarity.
 */
function findMatchingResumes(candidate, resumes) {
  if (!resumes || resumes.length === 0) return [];

  const candidateTokens = new Set();

  if (candidate.name) {
    candidate.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .forEach(t => candidateTokens.add(t));
  }

  if (candidate.id) {
    candidate.id
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .forEach(t => candidateTokens.add(t));
  }

  return resumes.filter(resumeFilename => {
    const resumeBase = resumeFilename
      .replace(/\.(docx|pdf)$/i, '')
      .replace(/_resume/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ');

    const resumeTokens = resumeBase.split(/\s+/).filter(Boolean);

    // If any significant token matches
    for (const token of resumeTokens) {
      if (token.length > 2 && candidateTokens.has(token)) {
        return true;
      }
    }

    // Direct substring checks
    const candidateIdClean = (candidate.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const resumeClean = resumeBase.replace(/[^a-z0-9]/g, '');
    if (candidateIdClean && (resumeClean.includes(candidateIdClean) || candidateIdClean.includes(resumeClean))) {
      return true;
    }

    return false;
  });
}

export async function GET(request) {
  try {
    const proxied = await proxyBackendRequest(request, '/api/candidates');
    if (proxied) return proxied;
    if (process.env.VERCEL && cloudStorageConfigured()) {
      const session = await currentCloudSession();
      if (!session) return NextResponse.json({ success: false, error: 'Please sign in to view saved profiles.' }, { status: 401 });
      const profiles = await listCloudProfiles(session);
      return NextResponse.json({
        success: true,
        candidates: profiles.map(profile => ({ ...profile, resume: profile.resumeName, source: 'managed' })),
        resumes: []
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    assertProfileStorageAvailable();
    const [candidates, resumes, profiles] = await Promise.all([
      getAllCandidates(),
      getCandidateResumes(),
      listProfiles()
    ]);

    const enrichedCandidates = candidates.map(candidate => {
      const matched = findMatchingResumes(candidate, resumes);
      return {
        ...candidate,
        resumes: matched,
        resume: matched[0] || null
      };
    });

    const managedProfiles = profiles.map(profile => ({
      ...profile,
      id: profile.id,
      name: profile.name,
      fullName: profile.name,
      profileCategory: profile.category,
      resume: profile.resumeName,
      resumeFilename: profile.resumeName,
      source: 'managed',
      updatedAt: profile.updatedAt
    }));

    return NextResponse.json({
      success: true,
      candidates: [
        ...enrichedCandidates.map(candidate => ({ ...candidate, source: 'legacy' })),
        ...managedProfiles
      ],
      resumes
    });
  } catch (error) {
    if (error.code === 'PROFILE_STORAGE_NOT_CONFIGURED') {
      return NextResponse.json({
        success: false,
        error: 'Connect Supabase Auth, run the ReachOps database setup SQL, and add NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your hosting environment before uploading resumes.',
        setupRequired: true
      }, { status: 503 });
    }
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch candidates'
      },
      { status: 500 }
    );
  }
}
