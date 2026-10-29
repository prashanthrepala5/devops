'use client';

import { useEffect, useState } from 'react';

const WORK_AUTH_OPTIONS = [
  'H1B',
  'F-1 STEM OPT',
  'US Citizen',
  'Green Card',
  'Other',
];

const AVAILABILITY_OPTIONS = [
  'Immediate',
  '2 weeks',
  '1 month',
  'Other',
];

const PROFILE_CATEGORIES = [
  ['frontend-web', 'Frontend / Web Development'],
  ['backend-java', 'Backend / Java'],
  ['full-stack', 'Full Stack'],
  ['data-engineering', 'Data Engineering / Analytics'],
  ['qa-testing', 'QA / Testing'],
  ['devops-cloud', 'DevOps / Cloud'],
  ['mobile-development', 'Mobile Development'],
  ['dotnet', '.NET'],
  ['custom', 'Other / Custom'],
];

const INITIAL_PROFILE = {
  fullName: '',
  category: 'frontend-web',
  customCategory: '',
  email: '',
  phone: '',
  linkedin: '',
  location: '',
  workAuth: 'H1B',
  availability: 'Immediate',
  totalExperience: '',
  skills: '',
  expectedSalary: '',
};

function formatCandidateData(candidate) {
  if (!candidate) return INITIAL_PROFILE;
  return {
    _profileId: candidate.source === 'managed' ? candidate.id : '',
    _mode: candidate.source === 'managed' ? 'edit' : 'new',
    fullName: candidate.fullName || candidate.name || '',
    category: candidate.category || candidate.profileCategory || 'frontend-web',
    customCategory: candidate.customCategory || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    linkedin: candidate.linkedin || candidate.linkedIn || '',
    location: candidate.location || '',
    workAuth: candidate.workAuth || candidate.workAuthorization || 'H1B',
    availability: candidate.availability || 'Immediate',
    totalExperience: candidate.totalExperience || candidate.experience || '',
    skills: Array.isArray(candidate.skills)
      ? candidate.skills.join(', ')
      : candidate.skills || '',
    expectedSalary: candidate.expectedSalary || candidate.rate || '',
  };
}

export default function ProfileForm({
  candidates = [],
  onProfileChange,
  profileData = INITIAL_PROFILE,
}) {
  const [mode, setMode] = useState('new'); // 'existing' | 'new'
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profileData?._profileId) {
      setMode('existing');
      setSelectedCandidateId(String(profileData._profileId));
    } else {
      setMode('new');
      setSelectedCandidateId('');
    }
  }, [profileData?._profileId]);

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    setErrors({});

    if (newMode === 'new') {
      setSelectedCandidateId('');
      if (onProfileChange) {
        onProfileChange({ ...INITIAL_PROFILE, _mode: 'new', _profileId: '' });
      }
    } else if (newMode === 'existing') {
      setSelectedCandidateId('');
      if (onProfileChange) {
        onProfileChange({ ...INITIAL_PROFILE, _mode: 'existing', _profileId: '' });
      }
    }
  };

  const handleCandidateSelect = (e) => {
    const selectedVal = e.target.value;
    setSelectedCandidateId(selectedVal);
    const candidate = candidates.find((c, idx) => {
      const cId = String(c.id || c.email || c.name || c.fullName || idx);
      return cId === selectedVal;
    });
    if (candidate && onProfileChange) {
      onProfileChange(formatCandidateData(candidate));
    }
  };

  const validateField = (name, value) => {
    let error = '';
    if (name === 'fullName' && (!value || !value.trim())) {
      error = 'Full Name is required.';
    }
    if (name === 'email' && value && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        error = 'Please enter a valid email address.';
      }
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextProfile = {
      ...profileData,
      [name]: value,
    };

    // Update field error
    const fieldError = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));

    if (onProfileChange) {
      onProfileChange(nextProfile);
    }
  };

  return (
    <div className="profile-form-container">
      {/* Mode Selector */}
      <div className="mode-selector-wrapper">
        <label htmlFor="profile-mode-select" className="mode-selector-label">
          Profile Mode
        </label>
        <div className="mode-select-box">
          <select
            id="profile-mode-select"
            className="form-input form-select mode-select"
            value={mode}
            onChange={handleModeChange}
            aria-label="Select mode: existing profile or new profile"
          >
            <option value="existing">Select Existing Profile</option>
            <option value="new">Create New Profile</option>
          </select>
        </div>
      </div>

      {/* Existing Candidate Dropdown (When Mode === 'existing') */}
      {mode === 'existing' && (
        <div className="form-group existing-candidate-group">
          <label htmlFor="existing-candidate-select" className="form-label">
            Existing Candidate
          </label>
          <select
            id="existing-candidate-select"
            className="form-input form-select"
            value={selectedCandidateId}
            onChange={handleCandidateSelect}
            aria-label="Select an existing candidate profile"
          >
            <option value="" disabled>
              -- Select Candidate Profile --
            </option>
            {candidates && candidates.length > 0 ? (
              candidates.map((c, index) => {
                const cId = String(c.id || c.email || c.name || c.fullName || index);
                const label = c.fullName || c.name || c.email || `Candidate #${index + 1}`;
                return (
                  <option key={cId} value={cId}>
                    {label}{c.profileCategory ? ` · ${c.profileCategory}` : ''} {c.email ? `(${c.email})` : ''}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>
                No existing candidate profiles found
              </option>
            )}
          </select>
        </div>
      )}

      {/* Form Fields Grid */}
      <div className="form-grid">
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="field-fullName" className="form-label">
            Full Name <span className="required-indicator">*</span>
          </label>
          <input
            type="text"
            id="field-fullName"
            name="fullName"
            className={`form-input ${errors.fullName ? 'has-error' : ''}`}
            placeholder="e.g. Jane Doe"
            value={profileData?.fullName || ''}
            onChange={handleInputChange}
            required
            aria-required="true"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && <span className="field-error-text">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="field-category" className="form-label">
            Job profile <span className="required-indicator">*</span>
          </label>
          <select
            id="field-category"
            name="category"
            className="form-input form-select"
            value={profileData?.category || 'frontend-web'}
            onChange={handleInputChange}
            required
          >
            {PROFILE_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {profileData?.category === 'custom' && (
          <div className="form-group">
            <label htmlFor="field-customCategory" className="form-label">
              Custom job profile <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              id="field-customCategory"
              name="customCategory"
              className="form-input"
              placeholder="e.g. Product Designer"
              value={profileData?.customCategory || ''}
              onChange={handleInputChange}
              maxLength={80}
              required
            />
          </div>
        )}

        {/* Email Address */}
        <div className="form-group">
          <label htmlFor="field-email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="field-email"
            name="email"
            className={`form-input ${errors.email ? 'has-error' : ''}`}
            placeholder="e.g. jane.doe@example.com"
            value={profileData?.email || ''}
            onChange={handleInputChange}
            aria-invalid={!!errors.email}
          />
          {errors.email && <span className="field-error-text">{errors.email}</span>}
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label htmlFor="field-phone" className="form-label">
            Phone Number
          </label>
          <input
            type="tel"
            id="field-phone"
            name="phone"
            className="form-input"
            placeholder="e.g. +1 (555) 234-5678"
            value={profileData?.phone || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* LinkedIn URL */}
        <div className="form-group">
          <label htmlFor="field-linkedin" className="form-label">
            LinkedIn URL
          </label>
          <input
            type="url"
            id="field-linkedin"
            name="linkedin"
            className="form-input"
            placeholder="e.g. https://linkedin.com/in/janedoe"
            value={profileData?.linkedin || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="field-location" className="form-label">
            Location
          </label>
          <input
            type="text"
            id="field-location"
            name="location"
            className="form-input"
            placeholder="e.g. Austin, TX or Remote (US)"
            value={profileData?.location || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Work Authorization */}
        <div className="form-group">
          <label htmlFor="field-workAuth" className="form-label">
            Work Authorization
          </label>
          <select
            id="field-workAuth"
            name="workAuth"
            className="form-input form-select"
            value={profileData?.workAuth || 'H1B'}
            onChange={handleInputChange}
          >
            {WORK_AUTH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Availability */}
        <div className="form-group">
          <label htmlFor="field-availability" className="form-label">
            Availability
          </label>
          <select
            id="field-availability"
            name="availability"
            className="form-input form-select"
            value={profileData?.availability || 'Immediate'}
            onChange={handleInputChange}
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Total Experience */}
        <div className="form-group">
          <label htmlFor="field-totalExperience" className="form-label">
            Total Experience
          </label>
          <div className="input-with-suffix">
            <input
              type="text"
              id="field-totalExperience"
              name="totalExperience"
              className="form-input"
              placeholder="e.g. 5"
              value={profileData?.totalExperience || ''}
              onChange={handleInputChange}
            />
            <span className="input-suffix">years</span>
          </div>
        </div>

        {/* Expected Salary/Rate */}
        <div className="form-group">
          <label htmlFor="field-expectedSalary" className="form-label">
            Expected Salary / Rate
          </label>
          <input
            type="text"
            id="field-expectedSalary"
            name="expectedSalary"
            className="form-input"
            placeholder="e.g. $130,000/yr or $65/hr C2C"
            value={profileData?.expectedSalary || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Key Skills (Spans full width in responsive layouts) */}
        <div className="form-group full-width">
          <label htmlFor="field-skills" className="form-label">
            Key Skills <span className="label-hint">(comma-separated)</span>
          </label>
          <textarea
            id="field-skills"
            name="skills"
            rows="3"
            className="form-input form-textarea"
            placeholder="e.g. Kubernetes, Docker, Terraform, AWS, CI/CD, Python, Prometheus"
            value={profileData?.skills || ''}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
}
