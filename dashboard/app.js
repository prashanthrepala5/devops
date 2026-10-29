(() => {
  const toast = document.getElementById('toast');
  const sidebar = document.getElementById('sidebar');
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2900);
  }

  document.querySelectorAll('[data-toast]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      showToast(button.dataset.toast);
    });
  });

  const searchInput = document.getElementById('job-search');
  let jobRows = [...document.querySelectorAll('.job-row')];
  const noResults = document.getElementById('no-results');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    jobRows.forEach((row) => {
      const matches = row.dataset.search.includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    noResults.hidden = visible > 0;
  });

  document.getElementById('filter-button').addEventListener('click', () => {
    showToast('All sample matches currently pass the selected experience filter.');
  });

  const jobDetails = {
    northstar: { title: 'Senior Frontend Engineer', company: 'Northstar Labs · Austin, TX', score: '92% match', skills: 'React · TypeScript · Next.js', date: 'Posted 2h ago', recruiter: 'Recruiter not identified' },
    clearpath: { title: 'Full Stack Developer', company: 'Clearpath AI · Remote, US', score: '86% match', skills: 'Node.js · React · AWS', date: 'Posted 5h ago', recruiter: 'Recruiter not identified' },
    orbit: { title: 'Frontend Developer', company: 'Orbit Commerce · New York, NY', score: '78% match', skills: 'JavaScript · Vue · CSS', date: 'Posted yesterday', recruiter: 'Recruiter not identified' }
  };
  let activeReviewJob = null;

  const reviewModal = document.getElementById('review-modal');
  const resumeModal = document.getElementById('resume-modal');
  let lastFocused;

  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.querySelector('.modal-close').focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (reviewModal.hidden && resumeModal.hidden) document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function attachReviewHandlers() {
    document.querySelectorAll('.row-action').forEach((button) => {
    button.addEventListener('click', () => {
      const job = jobDetails[button.dataset.job];
      if (!job) return;
      activeReviewJob = job;
      document.getElementById('modal-title').textContent = job.title;
      document.getElementById('modal-company').textContent = job.company;
      document.getElementById('modal-skills').textContent = job.skills;
      document.querySelector('.modal-score .match-score').innerHTML = `<i></i>${job.score}`;
      document.querySelector('.modal-score > span:last-child').textContent = job.date;
      document.querySelector('.modal-detail-grid > div:nth-child(3) b').textContent = job.candidate || document.getElementById('candidate-select').selectedOptions[0].textContent;
      document.querySelector('.modal-detail-grid > div:last-child b').textContent = job.recruiter || 'Contact details not looked up';
      const isLive = Number.isInteger(job.matchIndex);
      document.getElementById('modal-kicker').textContent = isLive ? 'LIVE LINKEDIN MATCH · OUTREACH REVIEW' : 'JOB MATCH · SAMPLE RECORD';
      document.getElementById('modal-experience').textContent = isLive ? 'Passed configured filter' : 'Passes · 3 years max';
      const outreachForm = document.getElementById('outreach-form');
      const prepareButton = document.getElementById('review-outreach');
      const sendButton = document.getElementById('send-outreach');
      const modalNote = document.getElementById('modal-note');
      outreachForm.hidden = true;
      sendButton.hidden = true;
      prepareButton.hidden = !isLive || job.outreachSent;
      modalNote.hidden = false;
      modalNote.lastChild.textContent = isLive
        ? (job.outreachSent ? `Email sent to ${job.outreachRecipient || 'the reviewed recipient'}.` : job.email ? `Email found in the LinkedIn post: ${job.email}. Review and edit it before sending.` : 'No email was found in the LinkedIn post. Enter a recipient address to send after reviewing the message.')
        : 'This is example data. No recruiter contact has been looked up, and no outreach can be sent from sample records.';
      document.getElementById('outreach-to').value = job.email || '';
      document.getElementById('outreach-subject').value = `Application for ${job.title} — ${job.candidate || 'candidate'}`;
      document.getElementById('outreach-message').value = `Hello ${job.recruiter && job.recruiter !== 'Recruiter not identified' ? job.recruiter : 'Hiring Team'},\n\nI saw your LinkedIn post about the ${job.title} role and would like to be considered. I have attached my resume for your review.\n\nThank you,\n${job.candidate || ''}`;
      openModal(reviewModal);
    });
  });
  }
  attachReviewHandlers();

  function renderLiveMatches(matches, postsScanned = 0) {
    const list = document.getElementById('jobs-list');
    const filterQuery = searchInput.value.trim().toLowerCase();
    list.innerHTML = '';
    document.querySelector('.results-heading .heading-count').textContent = String(matches.length);
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = postsScanned
        ? `Scanned ${postsScanned} posts; none passed the configured filters.`
        : 'No posts passed the configured filters.';
      list.appendChild(empty);
      return;
    }
    matches.forEach((match, index) => {
      const key = `live-${index}`;
      const skills = Array.isArray(match.skills) ? match.skills : [];
      const title = match.title || 'Role not identified';
      const company = match.company || 'Company not identified';
      const location = match.location || 'Location not identified';
      const detail = {
        title,
        company: `${company} · ${location}`,
        score: 'Filters passed',
        skills: skills.length ? skills.join(' · ') : 'No skills identified',
        date: match.matchedAt ? `Found ${new Date(match.matchedAt).toLocaleString()}` : 'Found just now',
        recruiter: match.recruiter || 'Contact details not looked up',
        candidate: match.candidate || 'Candidate not identified',
        email: match.email || null,
        matchIndex: index,
        outreachSent: Boolean(match.outreachSent)
      };
      jobDetails[key] = detail;
      const row = document.createElement('article');
      row.className = 'job-row';
      row.dataset.search = `${title} ${company} ${location} ${skills.join(' ')}`.toLowerCase();
      const initials = company === 'Company not identified' ? '—' : company.slice(0, 1).toUpperCase();
      row.innerHTML = '<div class="company-mark northstar"></div><div class="job-info"><div class="job-title"></div><div class="job-company"></div><div class="job-tags"></div></div><div class="job-meta"><span class="match-score"><i></i>Filters passed</span><span>Live result</span></div><button class="row-action" aria-label="Review matched job">→</button>';
      row.querySelector('.company-mark').textContent = initials;
      row.querySelector('.job-title').textContent = title;
      row.querySelector('.job-company').textContent = `${company} · ${location}`;
      const tags = row.querySelector('.job-tags');
      (skills.length ? skills.slice(0, 4) : ['No extracted skills']).forEach((skill) => {
        const tag = document.createElement('span');
        tag.textContent = skill;
        tags.appendChild(tag);
      });
      row.querySelector('.row-action').dataset.job = key;
      if (filterQuery && !row.dataset.search.includes(filterQuery)) row.hidden = true;
      list.appendChild(row);
    });
    jobRows = [...list.querySelectorAll('.job-row')];
    attachReviewHandlers();
  }

  const startButton = document.getElementById('start-search');
  const profileCategoryLabels = {
    'frontend-web': 'Frontend / Web Development', 'backend-java': 'Backend / Java',
    'full-stack': 'Full Stack', 'data-engineering': 'Data Engineering / Analytics',
    'qa-testing': 'QA / Testing', 'devops-cloud': 'DevOps / Cloud',
    'mobile-development': 'Mobile Development', dotnet: '.NET', custom: 'Custom'
  };
  async function loadCandidateOptions() {
    const select = document.getElementById('candidate-select');
    try {
      const response = await fetch('/api/candidates', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.candidates) || !data.candidates.length) return;
      const previous = select.value;
      select.replaceChildren();
      data.candidates.forEach((candidate) => {
        const option = document.createElement('option');
        option.value = String(candidate.id);
        option.textContent = candidate.category
          ? `${candidate.name} · ${profileCategoryLabels[candidate.category] || candidate.category}`
          : `${candidate.name} · Built-in profile`;
        select.appendChild(option);
      });
      select.value = data.candidates.some(candidate => String(candidate.id) === previous)
        ? previous
        : data.candidates.some(candidate => String(candidate.id) === '2') ? '2' : String(data.candidates[0].id);
    } catch {
      // Keep the built-in profile options in the HTML as a local fallback.
    }
  }

  let statusPoll;
  function setSearchButton(running) {
    startButton.disabled = running;
    startButton.innerHTML = running
      ? '<span class="button-spinner" aria-hidden="true"></span>Searching…'
      : '<svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6V4Z"/></svg>Start search';
  }

  async function pollSearchStatus() {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Dashboard service is unavailable.');
      const status = await response.json();
      if (status.status === 'running') {
        setSearchButton(true);
        showToast('LinkedIn search is running. Email sending is disabled.');
        window.clearInterval(statusPoll);
        statusPoll = window.setInterval(pollSearchStatus, 2500);
      } else if (status.status === 'complete') {
        window.clearInterval(statusPoll);
        setSearchButton(false);
        renderLiveMatches(status.matches || [], status.postsScanned || 0);
        showToast(`Search finished: ${(status.matches || []).length} matches queued from ${status.postsScanned || 0} posts. No email was sent.`);
      } else if (status.status === 'failed') {
        window.clearInterval(statusPoll);
        setSearchButton(false);
        showToast(status.error || 'Search failed. Check the local server output.');
      } else {
        window.clearInterval(statusPoll);
        setSearchButton(false);
      }
    } catch (error) {
      window.clearInterval(statusPoll);
      setSearchButton(false);
      showToast(error.message || 'Could not reach the local dashboard service.');
    }
  }

  async function startLinkedInSearch() {
    const config = {
      role: document.getElementById('role-select').value,
      candidateId: document.getElementById('candidate-select').value,
      date: document.getElementById('date-select').value,
      maxExperience: document.getElementById('experience-input').value,
      modifiers: document.getElementById('modifiers-input').value,
      target: document.getElementById('target-input').value,
      experienceFilter: document.getElementById('experience-toggle').checked
    };
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start search.');
      setSearchButton(true);
      showToast(result.message || 'Search started. No email will be sent.');
      window.clearInterval(statusPoll);
      statusPoll = window.setInterval(pollSearchStatus, 2500);
    } catch (error) {
      setSearchButton(false);
      showToast(error.message || 'Could not reach the local dashboard service.');
    }
  }

  document.getElementById('close-modal').addEventListener('click', () => closeModal(reviewModal));
  document.getElementById('close-review').addEventListener('click', () => closeModal(reviewModal));
  document.getElementById('review-outreach').addEventListener('click', () => {
    document.getElementById('modal-note').hidden = true;
    document.getElementById('outreach-form').hidden = false;
    document.getElementById('review-outreach').hidden = true;
    document.getElementById('send-outreach').hidden = false;
    document.getElementById('outreach-to').focus();
  });
  document.getElementById('send-outreach').addEventListener('click', async () => {
    const activeJob = activeReviewJob;
    const selectedIndex = activeJob?.matchIndex;
    const to = document.getElementById('outreach-to').value.trim();
    const subject = document.getElementById('outreach-subject').value.trim();
    const text = document.getElementById('outreach-message').value.trim();
    if (!Number.isInteger(selectedIndex)) return showToast('Only live search matches can send email.');
    if (!to || !subject || !text) return showToast('Complete the recipient, subject, and message first.');
    if (!window.confirm(`Send this reviewed email to ${to}? The selected candidate resume will be attached.`)) return;
    const button = document.getElementById('send-outreach');
    button.disabled = true;
    try {
      const response = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIndex: selectedIndex, to, subject, text })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Email could not be sent.');
      activeJob.outreachSent = true;
      activeJob.outreachRecipient = to;
      closeModal(reviewModal);
      showToast(result.message || 'Reviewed email sent.');
      document.getElementById('send-outreach').hidden = true;
      document.getElementById('review-outreach').hidden = true;
    } catch (error) {
      showToast(error.message || 'Email could not be sent.');
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('preview-resume').addEventListener('click', () => openModal(resumeModal));
  document.getElementById('close-resume').addEventListener('click', () => closeModal(resumeModal));
  document.getElementById('close-resume-action').addEventListener('click', () => closeModal(resumeModal));

  [reviewModal, resumeModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!reviewModal.hidden) closeModal(reviewModal);
      else if (!resumeModal.hidden) closeModal(resumeModal);
      sidebar.classList.remove('open');
    }
  });

  document.getElementById('save-config').addEventListener('click', () => {
    const config = {
      role: document.getElementById('role-select').value,
      candidate: document.getElementById('candidate-select').value,
      date: document.getElementById('date-select').value,
      maxExperience: document.getElementById('experience-input').value,
      modifiers: document.getElementById('modifiers-input').value,
      target: document.getElementById('target-input').value,
      experienceFilter: document.getElementById('experience-toggle').checked
    };
    try {
      window.localStorage.setItem('reachops-dashboard-draft', JSON.stringify(config));
      showToast('Draft saved in this browser. It was not sent to the automation.');
    } catch {
      showToast('Browser storage is unavailable. Your draft remains on this page.');
    }
  });

  startButton.addEventListener('click', startLinkedInSearch);
  document.getElementById('new-campaign').addEventListener('click', () => {
    document.querySelector('.setup-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('role-select').focus({ preventScroll: true });
    showToast('Configure a draft campaign below. Starting it is not connected in this preview.');
  });
  document.getElementById('dismiss-banner').addEventListener('click', () => {
    document.querySelector('.demo-banner').remove();
  });
  document.getElementById('menu-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));

  const destinations = {
    overview: document.querySelector('.welcome-row'),
    campaigns: document.querySelector('.campaign-section'),
    activity: document.querySelector('.activity-panel'),
    settings: document.querySelector('.setup-panel')
  };
  document.querySelectorAll('[data-view]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const view = link.dataset.view;
      document.querySelectorAll('.main-nav .nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
      if (destinations[view]) destinations[view].scrollIntoView({ behavior: 'smooth', block: 'start' });
      else showToast(view === 'candidates' ? 'Candidate directory is sample data in this preview.' : 'This view is not connected in the preview.');
      sidebar.classList.remove('open');
      document.querySelector('.breadcrumbs b').textContent = view.charAt(0).toUpperCase() + view.slice(1);
    });
  });

  try {
    const saved = JSON.parse(window.localStorage.getItem('reachops-dashboard-draft') || 'null');
    if (saved) {
      document.getElementById('role-select').value = saved.role;
      document.getElementById('candidate-select').value = saved.candidate;
      document.getElementById('date-select').value = saved.date;
      document.getElementById('experience-input').value = saved.maxExperience;
      document.getElementById('modifiers-input').value = saved.modifiers;
      document.getElementById('target-input').value = saved.target;
      document.getElementById('experience-toggle').checked = saved.experienceFilter;
    }
  } catch {
    // The dashboard remains usable when browser storage is unavailable.
  }
  loadCandidateOptions();
  pollSearchStatus();
})();
