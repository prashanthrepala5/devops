'use client';

import Link from 'next/link';
import { profileCategoryLabel } from '@/lib/profile-categories';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'RO';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.flatMap((s) => (typeof s === 'string' ? s.split(',') : [])).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export default function ProfileCard({ candidate = {}, onDelete }) {
  const name = candidate.fullName || candidate.name || 'Unnamed Candidate';
  const initials = getInitials(name);
  const email = candidate.email;
  const phone = candidate.phone;
  const location = candidate.location;
  const experience = candidate.totalExperience || candidate.experience;
  const availability = candidate.availability;
  const workAuth = candidate.workAuth || candidate.workAuthorization;
  const linkedin = candidate.linkedin || candidate.linkedIn;
  const resume = candidate.resume || candidate.resumeName || candidate.resumeFilename;
  const category = profileCategoryLabel(candidate.profileCategory || candidate.category, candidate.customCategory);
  const skillsList = parseSkills(candidate.skills);

  return (
    <article className="profile-card" aria-label={`Candidate profile for ${name}`}>
      {/* Header with Avatar & Name */}
      <div className="profile-card-header">
        <div className="profile-avatar" aria-hidden="true">
          <span>{initials}</span>
        </div>
        <div className="profile-identity">
          <h3 className="profile-name">{name}</h3>
          <div className="profile-meta-badges">
            {candidate.profileCategory && <span className="profile-category-badge">{category}</span>}
            {workAuth && <span className="profile-badge-auth">{workAuth}</span>}
            {availability && (
              <span className="profile-badge-avail">
                <span className="avail-dot" />
                {availability}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detail Rows */}
      <div className="profile-details-list">
        {email && (
          <div className="profile-detail">
            <svg
              className="detail-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 6L12 13L2 6" />
            </svg>
            <span className="detail-value">
              <a href={`mailto:${email}`} className="detail-link" title={`Email ${email}`}>
                {email}
              </a>
            </span>
          </div>
        )}

        {phone && (
          <div className="profile-detail">
            <svg
              className="detail-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="detail-value">{phone}</span>
          </div>
        )}

        {location && (
          <div className="profile-detail">
            <svg
              className="detail-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="detail-value">{location}</span>
          </div>
        )}

        {experience && (
          <div className="profile-detail">
            <svg
              className="detail-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span className="detail-value">
              {experience.toString().toLowerCase().includes('year')
                ? experience
                : `${experience} years experience`}
            </span>
          </div>
        )}

        {linkedin && (
          <div className="profile-detail">
            <svg
              className="detail-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            <span className="detail-value">
              <a
                href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link"
                title="Open LinkedIn Profile"
              >
                LinkedIn Profile
              </a>
            </span>
          </div>
        )}
      </div>

      {/* Skills Section */}
      {skillsList.length > 0 && (
        <div className="profile-skills-section">
          <div className="skills-header">Skills</div>
          <div className="skills-container" role="list" aria-label="Skills">
            {skillsList.map((skill, idx) => (
              <span key={`${skill}-${idx}`} className="skill-tag" role="listitem">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resume Document Footer */}
      {resume && (
        <div className="profile-resume-row">
          <svg
            className="resume-doc-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="resume-filename" title={typeof resume === 'string' ? resume : resume.name}>
            {typeof resume === 'string' ? resume : resume.name || 'Resume Attached'}
          </span>
        </div>
      )}
      {candidate.source === 'managed' && (
        <div className="profile-card-management">
          {candidate.updatedAt && <span>Updated {new Date(candidate.updatedAt).toLocaleDateString()}</span>}
          <div>
            <Link href={`/upload?profileId=${encodeURIComponent(candidate.id)}`} className="profile-manage-edit">Edit profile</Link>
            <button type="button" className="profile-manage-delete" onClick={() => onDelete?.(candidate)} aria-label={`Delete profile for ${name}`}>Delete</button>
          </div>
        </div>
      )}
    </article>
  );
}
