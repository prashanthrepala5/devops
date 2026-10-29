'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ResumeUploader from '../../components/ResumeUploader';
import ProfileForm from '../../components/ProfileForm';
import { profileCategoryLabel } from '@/lib/profile-categories';

const INITIAL_PROFILE = {
  _mode: 'new',
  _profileId: '',
  fullName: '',
  category: 'frontend-web',
  customCategory: '',
  email: '',
  phone: '',
  linkedin: '',
  location: '',
  workAuth: '',
  availability: '',
  totalExperience: '',
  skills: '',
  expectedSalary: '',
};

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      let data;
      try { data = JSON.parse(request.responseText); }
      catch { return reject(new Error('The server returned an unreadable response.')); }
      if (request.status < 200 || request.status >= 300 || !data.success) {
        return reject(new Error(data.error || 'Upload failed.'));
      }
      resolve(data);
    });
    request.addEventListener('error', () => reject(new Error('Network error while uploading the resume.')));
    request.addEventListener('abort', () => reject(new Error('Resume upload was cancelled.')));
    request.send(formData);
  });
}

function uploadToSignedUrl(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    request.setRequestHeader('x-upsert', 'false');
    request.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) return reject(new Error('Private resume storage rejected the upload. Check the Supabase bucket and storage policies.'));
      resolve();
    });
    request.addEventListener('error', () => reject(new Error('Network error while uploading the resume to private storage.')));
    request.addEventListener('abort', () => reject(new Error('Resume upload was cancelled.')));
    request.send(file);
  });
}

export default function UploadPage() {
  const [candidates, setCandidates] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [profileData, setProfileData] = useState(INITIAL_PROFILE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState('');
  const [existingResumeName, setExistingResumeName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [setupRequired, setSetupRequired] = useState('');
  const [cloudUploadsEnabled, setCloudUploadsEnabled] = useState(false);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  // Fetch existing candidates on mount
  useEffect(() => {
    let isMounted = true;

    async function loadCandidates() {
      try {
        const authState = await fetch('/api/auth/session', { cache: 'no-store' }).then(response => response.json()).catch(() => null);
        if (isMounted) setCloudUploadsEnabled(Boolean(authState?.cloudUploadsEnabled));
        const res = await fetch('/api/candidates');
        const data = await res.json();
        if (!res.ok) {
          if (data.setupRequired) setSetupRequired(data.error);
          throw new Error(data.error || 'Failed to load candidate list');
        }
        if (isMounted && data.success && Array.isArray(data.candidates)) {
          setCandidates(data.candidates);
        }
      } catch (err) {
        if (isMounted) {
          showToast('error', err.message || 'Could not load profiles.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCandidates(false);
        }
      }
    }

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    const profileId = new URLSearchParams(window.location.search).get('profileId');
    if (!profileId) return;
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(profileId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not load this profile.');
        if (!active) return;
        const profile = data.profile;
        setEditingProfileId(profile.id);
        setExistingResumeName(profile.resumeName || '');
        setProfileData({
          ...INITIAL_PROFILE,
          ...profile,
          fullName: profile.name,
          workAuth: profile.workAuthorization || '',
          totalExperience: profile.experience || '',
          _mode: 'edit',
          _profileId: profile.id
        });
      })
      .catch((error) => { if (active) showToast('error', error.message); });
    return () => { active = false; };
  }, [showToast]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleProfileChange = (updated) => {
    setProfileData(updated);
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const name = profileData.fullName?.trim();
    if (!name) {
      showToast('error', 'Please provide candidate Full Name before submitting.');
      return;
    }

    if (!selectedFile && !profileData._profileId) {
      showToast('error', 'Please select or drop a resume file (.docx or .pdf).');
      return;
    }
    if (profileData.category === 'custom' && !profileData.customCategory.trim()) {
      showToast('error', 'Enter the custom job profile.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(selectedFile ? 0 : null);
      const fields = {
        name,
        category: profileData.category,
        customCategory: profileData.customCategory,
        email: profileData.email,
        phone: profileData.phone,
        linkedin: profileData.linkedin,
        location: profileData.location,
        workAuthorization: profileData.workAuth,
        availability: profileData.availability,
        experience: profileData.totalExperience,
        skills: profileData.skills,
        expectedSalary: profileData.expectedSalary
      };
      let data;
      let profile;
      async function requestUploadToken(profileId = '') {
        const response = await fetch('/api/profiles/upload-token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, fileName: selectedFile.name, fileSize: selectedFile.size })
        });
        const token = await response.json();
        if (!response.ok || !token.success) throw new Error(token.error || 'Could not prepare the private resume upload.');
        return token;
      }

      async function finalizeResumeUpload(token, profileId = '') {
        await uploadToSignedUrl(token.signedUrl, selectedFile, setUploadProgress);
        const body = { objectPath: token.objectPath, resumeName: selectedFile.name, resumeSize: selectedFile.size };
        const endpoint = profileId ? `/api/profiles/${encodeURIComponent(profileId)}/resume` : '/api/profiles';
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileId ? body : { fields, upload: { ...body, profileId: token.profileId } })
        });
        data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not save the profile and resume.');
        profile = data.profile;
      }

      if (profileData._profileId) {
        const response = await fetch(`/api/profiles/${encodeURIComponent(profileData._profileId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields)
        });
        data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Profile could not be updated.');
        profile = data.profile;
        if (selectedFile) {
          if (cloudUploadsEnabled) {
            const token = await requestUploadToken(profile.id);
            await finalizeResumeUpload(token, profile.id);
          } else {
            const resumeForm = new FormData();
            resumeForm.append('resume', selectedFile);
            data = await uploadWithProgress(`/api/profiles/${encodeURIComponent(profile.id)}/resume`, resumeForm, setUploadProgress);
            profile = data.profile;
          }
        }
      } else {
        if (cloudUploadsEnabled) {
          const token = await requestUploadToken();
          await finalizeResumeUpload(token);
        } else {
          const formData = new FormData();
          Object.entries(fields).forEach(([key, value]) => formData.append(key, String(value || '')));
          formData.append('resume', selectedFile);
          data = await uploadWithProgress('/api/profiles', formData, setUploadProgress);
          profile = data.profile;
        }
      }

      setEditingProfileId(profile.id);
      setExistingResumeName(profile.resumeName || selectedFile?.name || '');
      setProfileData(current => ({ ...current, _profileId: profile.id, _mode: 'edit' }));
      setCandidates(current => {
        const updated = { ...profile, id: profile.id, fullName: profile.name, profileCategory: profile.category, source: 'managed', resume: profile.resumeName };
        return [...current.filter(item => item.id !== profile.id), updated];
      });
      showToast('success', data.message || 'Profile and resume saved by the configured backend.');
      setSubmittedResult({
        candidate: { ...profileData, fullName: name },
        filename: profile.resumeName || selectedFile?.name || existingResumeName,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      showToast('error', err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleReset = () => {
    setSubmittedResult(null);
    setSelectedFile(null);
    setProfileData(INITIAL_PROFILE);
    setEditingProfileId('');
    setExistingResumeName('');
    window.history.replaceState(null, '', '/upload');
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div className="page-header animate-in">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Upload Resume</span>
          </nav>
          <h1 className="page-title">{editingProfileId ? 'Edit Candidate Profile' : 'Create Candidate Profile'}</h1>
          <p className="page-subtitle">
            Add a name, choose a job profile, and upload a PDF or DOCX resume.
          </p>
        </div>
      </div>

      <div className="profile-storage-notice" role="note">
        <strong>Profile storage and privacy</strong>
        <span>On Vercel, ReachOps uses Supabase sign-in, owner-scoped profile records, and a private resume bucket. Configure the Supabase project URL and publishable key, then run the included database setup SQL before accepting uploads.</span>
      </div>
      {setupRequired && <div className="setup-required-notice" role="alert"><strong>Deployment setup required</strong><span>{setupRequired}</span></div>}

      {/* Confirmation State */}
      {submittedResult ? (
        <div className="confirmation-panel animate-in" role="region" aria-label="Upload Confirmation">
          <div className="confirmation-header">
            <div className="confirmation-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="confirmation-title">Profile Saved Successfully</h2>
              <p className="text-muted text-sm">
                The configured backend saved this profile and resume. Select the profile in a connected search workflow.
              </p>
            </div>
          </div>

          <div className="confirmation-details-grid">
            <div>
              <div className="confirmation-item-label">Candidate Name</div>
              <div className="confirmation-item-value">{submittedResult.candidate.fullName}</div>
            </div>
            <div>
              <div className="confirmation-item-label">Job Profile</div>
              <div className="confirmation-item-value">{profileCategoryLabel(submittedResult.candidate.category, submittedResult.candidate.customCategory)}</div>
            </div>
            <div>
              <div className="confirmation-item-label">Resume Document</div>
              <div className="confirmation-item-value text-gradient">{submittedResult.filename}</div>
            </div>
            <div>
              <div className="confirmation-item-label">Work Authorization</div>
              <div className="confirmation-item-value">{submittedResult.candidate.workAuth || 'Not provided'}</div>
            </div>
            <div>
              <div className="confirmation-item-label">Availability</div>
              <div className="confirmation-item-value">{submittedResult.candidate.availability || 'Not provided'}</div>
            </div>
            {submittedResult.candidate.email && (
              <div>
                <div className="confirmation-item-label">Email Address</div>
                <div className="confirmation-item-value">{submittedResult.candidate.email}</div>
              </div>
            )}
            {submittedResult.candidate.totalExperience && (
              <div>
                <div className="confirmation-item-label">Experience</div>
                <div className="confirmation-item-value">{submittedResult.candidate.totalExperience} years</div>
              </div>
            )}
          </div>

          <div className="confirmation-actions">
            <Link href="/submissions" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Manage Profiles</span>
            </Link>
            <button type="button" onClick={handleReset} className="btn btn-outline"><span>Add Another Profile</span></button>
            <Link href="/submissions" className="btn btn-outline">
              <span>View All Submissions</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        /* Upload Form Layout */
        <form onSubmit={handleSubmit} noValidate>
          <div className="upload-layout animate-in">
            {/* Left Column: Profile Form */}
            <div className="upload-main">
              {isLoadingCandidates ? (
                <div className="skeleton-card" aria-label="Loading candidate profile options">
                  <div className="skeleton-line title shimmer-bg" />
                  <div className="skeleton-line shimmer-bg" style={{ width: '80%' }} />
                  <div className="skeleton-line shimmer-bg" style={{ height: '42px', marginTop: '1rem' }} />
                  <div className="skeleton-line shimmer-bg" style={{ height: '42px' }} />
                  <div className="skeleton-line shimmer-bg" style={{ height: '42px' }} />
                  <div className="skeleton-line shimmer-bg" style={{ height: '80px' }} />
                </div>
              ) : (
                <ProfileForm
                  candidates={candidates}
                  profileData={profileData}
                  onProfileChange={handleProfileChange}
                />
              )}
            </div>

            {/* Right Column: Resume Uploader */}
            <div className="upload-sidebar">
              <div className="glass-card">
                <h3 className="mb-2" style={{ fontSize: '1.1rem' }}>{editingProfileId ? 'Replace Resume' : 'Resume Document'}</h3>
                <p className="text-muted text-sm mb-3">
                  {editingProfileId ? `Current file: ${existingResumeName || 'Resume attached'}. Choose a new file only if you want to replace it.` : 'Upload a PDF or DOCX resume. Maximum size is 10 MB.'}
                </p>
                <ResumeUploader
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                />
                {uploadProgress !== null && <div className="upload-progress" role="status" aria-live="polite"><div className="upload-progress-track"><span style={{ width: `${uploadProgress}%` }} /></div><span>{uploadProgress === 100 ? 'Finishing upload…' : `Uploading resume · ${uploadProgress}%`}</span></div>}
              </div>

              {/* Upload Tips */}
              <div className="glass-card">
                <h4 className="text-sm font-semibold mb-2" style={{ color: '#93c5fd' }}>
                  Tips for Better Automation
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Ensure contact details in the resume match the candidate profile.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Include targeted keywords in the skills section to optimize job matching.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Maximum resume file size is 10MB.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="upload-submit-bar animate-in">
            <div>
              <p className="font-semibold text-white">{editingProfileId ? 'Save profile changes?' : 'Ready to save this profile?'}</p>
              <p className="submit-helper-text">
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : editingProfileId ? `Keeping current resume: ${existingResumeName}` : 'Please attach a resume file above.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(setupRequired)}
              className="btn btn-primary"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Uploading & Saving...</span>
                </>
              ) : (
                <>
                  <span>{editingProfileId ? 'Save Profile' : 'Create Profile & Upload Resume'}</span>
                  <svg
                    className="btn-arrow-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="3" y1="8" x2="13" y2="8" />
                    <polyline points="9 4 13 8 9 12" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Inline Toast Notification */}
      {toast && (
        <div className="toast-container" aria-live="assertive">
          <div
            className={`toast ${
              toast.type === 'success' ? 'toast-success' : 'toast-error'
            }`}
            role="alert"
          >
            {toast.type === 'success' ? (
              <svg viewBox="0 0 20 20" fill="#22c55e" width="20" height="20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="#ef4444" width="20" height="20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <div style={{ flex: 1 }}>
              <div className="toast-title">
                {toast.type === 'success' ? 'Success' : 'Error'}
              </div>
              <div className="toast-desc">{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="btn-ghost"
              style={{ padding: '0.2rem', cursor: 'pointer', border: 'none', background: 'transparent' }}
              aria-label="Close notification"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
