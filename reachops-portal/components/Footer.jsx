export default function Footer() {
  const currentYear = 2026;

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-content">
        <p className="footer-brand">
          ReachOps Portal &middot; Built for LinkedIn Outreach Automation &copy; {currentYear}
        </p>
        <div className="footer-links">
          <a
            href="http://localhost:8000"
            className="footer-external-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open ReachOps Automation Dashboard on port 8000"
          >
            <span className="live-status-dot" aria-hidden="true" />
            <span>Automation Dashboard</span>
            <svg
              className="external-link-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
              <polyline points="10 2 14 2 14 6" />
              <line x1="6" y1="10" x2="14" y2="2" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
