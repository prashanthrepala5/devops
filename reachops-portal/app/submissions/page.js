'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProfileCard from '../../components/ProfileCard';

export default function SubmissionsPage() {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [setupRequired, setSetupRequired] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial fetch on mount
  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        setError(null);
        const res = await fetch('/api/candidates');
        const data = await res.json();
        if (data.setupRequired) setSetupRequired(data.error || 'Deployment storage is not configured.');
        if (!res.ok) {
          throw new Error(data.error || `Failed to load candidates (HTTP ${res.status})`);
        }
        if (!ignore) {
          if (data.success && Array.isArray(data.candidates)) {
            setCandidates(data.candidates);
          } else {
            setCandidates([]);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching submissions:', err);
          setError(err.message || 'Failed to fetch candidates from server.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.setupRequired) setSetupRequired(data.error || 'Deployment storage is not configured.');
      if (!res.ok) {
        throw new Error(data.error || `Failed to load candidates (HTTP ${res.status})`);
      }
      if (data.success && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Error refreshing submissions:', err);
      setError(err.message || 'Failed to refresh candidates.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (candidate) => {
    const confirmed = window.confirm(`Delete ${candidate.fullName || candidate.name}'s profile and stored resume from your ReachOps workspace?`);
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(candidate.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Profile could not be deleted.');
      setCandidates(current => current.filter(item => item.id !== candidate.id));
    } catch (deleteError) {
      setError(deleteError.message || 'Profile could not be deleted.');
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const name = (candidate.fullName || candidate.name || '').toLowerCase();
    const skills = Array.isArray(candidate.skills)
      ? candidate.skills.join(' ').toLowerCase()
      : (candidate.skills || '').toLowerCase();
    const location = (candidate.location || '').toLowerCase();
    const workAuth = (candidate.workAuth || candidate.workAuthorization || '').toLowerCase();

    return (
      name.includes(query) ||
      skills.includes(query) ||
      location.includes(query) ||
      workAuth.includes(query)
    );
  });

  return (
    <div className="container">
      {/* Page Header */}
      <div className="page-header animate-in">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Submissions</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Candidate Submissions
            </h1>
            {!isLoading && (
              <span className="count-badge" aria-label={`${candidates.length} candidates`}>
                {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'}
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.35rem' }}>
            Manage candidate profiles and the resume associated with each profile.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="btn btn-outline"
            aria-label="Refresh candidates"
            title="Reload candidate submissions"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
              className={isRefreshing ? 'animate-pulse' : ''}
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link href="/upload" className="btn btn-primary" aria-label="Upload New Resume">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Upload Resume</span>
          </Link>
        </div>
      </div>

      <div className="profile-storage-notice" role="note">
        <strong>Profile storage</strong>
        <span>On Vercel, this list is scoped to the signed-in account. Locally, profiles remain in the shared operator workspace used by the separate automation.</span>
      </div>
      {setupRequired && <div className="setup-required-notice" role="alert"><strong>Deployment setup required</strong><span>{setupRequired}</span></div>}

      {/* Toolbar / Search Bar */}
      <div className="submissions-toolbar animate-in">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, skills, work auth, or location..."
            className="form-input search-input"
            aria-label="Filter candidates by name or skills"
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          className="upload-error-msg mb-4 animate-in"
          role="alert"
          style={{ maxWidth: '600px', margin: '0 auto 2rem' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="submissions-grid" aria-label="Loading candidates">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-header">
                <div className="skeleton-avatar shimmer-bg" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line title shimmer-bg" />
                  <div className="skeleton-line badge shimmer-bg" />
                </div>
              </div>
              <div className="skeleton-line shimmer-bg" style={{ width: '90%' }} />
              <div className="skeleton-line shimmer-bg" style={{ width: '75%' }} />
              <div className="skeleton-line shimmer-bg" style={{ width: '60%' }} />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <div className="skeleton-line shimmer-bg" style={{ width: '50px', height: '22px', borderRadius: '12px' }} />
                <div className="skeleton-line shimmer-bg" style={{ width: '60px', height: '22px', borderRadius: '12px' }} />
                <div className="skeleton-line shimmer-bg" style={{ width: '45px', height: '22px', borderRadius: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCandidates.length > 0 ? (
        /* Candidates Grid */
        <div className="submissions-grid">
          {filteredCandidates.map((candidate, idx) => {
            const cardKey = candidate.id || candidate.email || candidate.name || idx;
            return (
              <div
                key={cardKey}
                className="animate-in"
                style={{ animationDelay: `${Math.min(idx * 0.08, 0.6)}s` }}
              >
                <ProfileCard candidate={candidate} onDelete={handleDelete} />
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="empty-state animate-in" role="region" aria-label="No candidates found">
          <div className="empty-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h2 className="empty-state-title">
            {searchQuery ? 'No Matching Candidates' : 'No Candidates Found'}
          </h2>
          <p className="empty-state-desc">
            {searchQuery
              ? `No candidates match "${searchQuery}". Try searching for another skill, location, or name.`
              : 'No candidate profiles have been added to the system yet. Upload your first resume to get started.'}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn btn-outline"
            >
              Clear Search Filter
            </button>
          ) : (
            <Link href="/upload" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Upload First Resume</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
