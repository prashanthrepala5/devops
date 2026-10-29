import Link from 'next/link';
export default async function HomePage() {
  const stats = [
    {
      id: 'candidates',
      label: 'Job Profile Options',
      value: '9 categories',
      colorClass: 'stat-icon-blue',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'formats',
      label: 'Supported Formats',
      value: '.docx & .pdf',
      colorClass: 'stat-icon-teal',
      icon: (
        <svg
          className="stat-icon"
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
      ),
    },
    {
      id: 'presets',
      label: 'Role Presets',
      value: '7 built-in',
      colorClass: 'stat-icon-purple',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      step: '1',
      title: 'Select Profile',
      desc: 'Choose an existing candidate record or create a brand new profile with comprehensive details, work authorization, and job preferences.',
    },
    {
      step: '2',
      title: 'Upload Resume',
      desc: 'Drag and drop a PDF or DOCX resume. Hosted uploads use a private account-owned storage bucket after setup.',
    },
    {
      step: '3',
      title: 'Review Search Matches',
      desc: 'Choose the saved profile in the local automation dashboard, review matches, then review any message before sending.',
    },
  ];

  const quickLinks = [
    {
      href: '/upload',
      title: 'Open Upload Form',
      desc: 'Submit a new resume and update candidate details',
      external: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      href: '/submissions',
      title: 'View All Candidates',
      desc: 'Browse current candidate submissions, skills, and resumes',
      external: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: 'http://localhost:8000',
      title: 'Open Dashboard',
      desc: 'Connect to the live Playwright LinkedIn outreach automation engine',
      external: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-bg-grid" aria-hidden="true" />
        <div className="hero-glow-orb" aria-hidden="true" />

        <div className="hero-content animate-in">
          <div className="hero-eyebrow">
            <span className="live-status-dot" aria-hidden="true" />
            <span>REACHOPS PORTAL</span>
          </div>

          <h1 id="hero-title" className="hero-heading">
            Upload <span className="text-gradient">Resumes.</span>
            {'\n'}Manage <span className="text-gradient">Candidates.</span>
            {'\n'}Automate <span className="text-gradient-teal">Outreach.</span>
          </h1>

          <p className="hero-subtitle">
            A candidate workspace for adding profiles and resumes for LinkedIn recruiter outreach automation.
          </p>

          <div className="hero-cta-group">
            <Link href="/upload" className="btn btn-primary" aria-label="Upload Resume">
              <span>Upload Resume</span>
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
            </Link>

            <Link href="/submissions" className="btn btn-outline" aria-label="View Submissions">
              <span>View Submissions</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="container profile-storage-notice" role="note">
        <strong>Storage and workflow status</strong>
        <span>Hosted profile uploads become available after Supabase is configured. Local development uses a shared operator workspace, and the separate Playwright automation is not started from this portal.</span>
      </div>

      {/* Stats Section */}
      <section className="stats-section container" aria-label="Key Statistics">
        <div className="grid-3">
          {stats.map((stat, idx) => (
            <div
              key={stat.id}
              className={`glass-card stat-card animate-in`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`stat-icon-wrapper ${stat.colorClass}`} aria-hidden="true">
                {stat.icon}
              </div>
              <div className="stat-card-value">{stat.value}</div>
              <div className="stat-card-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section container" aria-labelledby="how-it-works-title">
        <div className="section-header animate-in">
          <p className="section-eyebrow">HOW IT WORKS</p>
          <h2 id="how-it-works-title" className="section-title">
            Streamlined in 3 Easy Steps
          </h2>
          <p className="section-desc">
            Everything you need to orchestrate candidate discovery and LinkedIn outreach campaigns effortlessly.
          </p>
        </div>

        <div className="grid-3">
          {steps.map((item, idx) => (
            <div
              key={item.step}
              className="glass-card step-card animate-in"
              style={{ animationDelay: `${0.15 + idx * 0.12}s` }}
            >
              <div className="step-badge" aria-hidden="true">
                {item.step}
              </div>
              <h3 className="step-title">{item.title}</h3>
              <p className="step-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="quick-access-section container" aria-labelledby="quick-access-title">
        <div className="section-header animate-in">
          <p className="section-eyebrow">QUICK ACCESS</p>
          <h2 id="quick-access-title" className="section-title">
            Portal Shortcuts
          </h2>
          <p className="section-desc">
            Jump directly into management workflows or launch the automation dashboard.
          </p>
        </div>

        <div className="grid-3">
          {quickLinks.map((item, idx) => {
            const cardContent = (
              <>
                <div className="quick-card-left">
                  <div className="quick-card-icon" aria-hidden="true">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="quick-card-title">{item.title}</h3>
                    <p className="quick-card-desc">{item.desc}</p>
                  </div>
                </div>
                <svg
                  className="quick-card-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            );

            return item.external ? (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card quick-card animate-in"
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                aria-label={`${item.title} (opens in new tab)`}
              >
                {cardContent}
              </a>
            ) : (
              <Link
                key={item.title}
                href={item.href}
                className="glass-card quick-card animate-in"
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                aria-label={item.title}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
