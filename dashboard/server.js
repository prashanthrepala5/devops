const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(path.resolve(__dirname, '..'), '.env') });
const nodemailer = require('nodemailer');
const { selectCandidate, getCandidateOptions } = require('../tests/Candidate_Selector');

const projectRoot = path.resolve(__dirname, '..');
const staticRoot = __dirname;
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8000);
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const resultsPath = path.join(os.tmpdir(), `reachops-results-${process.pid}.json`);

const roleQueries = {
  WEB: 'Frontend Developer React Full Stack Developer',
  JAVA: 'Java Developer Backend Microservices',
  QA: 'QA Engineer Software Tester',
  PYTHON: 'Python Developer',
  DEVOPS: 'DevOps Engineer Cloud Engineer',
  DOTNET: '.NET Developer',
  MOBILE: 'Mobile Developer Android iOS',
  CUSTOM: 'Software Engineer'
};
const roleDomains = {
  WEB: ['Web', 'Frontend', 'React', 'Full Stack', 'JavaScript', 'Node.js'],
  JAVA: ['Java', 'Microservices', 'Spring', 'Backend'],
  QA: ['QA', 'Quality Assurance', 'Testing', 'Test Engineer'],
  PYTHON: ['Python', 'Django', 'Flask', 'FastAPI'],
  DEVOPS: ['DevOps', 'Cloud', 'Kubernetes', 'AWS', 'Azure'],
  DOTNET: ['.NET', 'C#', 'ASP.NET'],
  MOBILE: ['Mobile', 'Android', 'iOS', 'Flutter', 'React Native'],
  CUSTOM: []
};

let state = { status: 'idle', startedAt: null, finishedAt: null, matches: [], postsScanned: 0, log: '', error: null };

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 20000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Request body must be valid JSON.')); }
    });
    request.on('error', reject);
  });
}

function startSearch(config) {
  const candidateId = String(config.candidateId || '2');
  const role = String(config.role || 'WEB');
  const date = config.date === 'week' ? 'week' : '24h';
  const target = Number(config.target);
  const maxExperience = Number(config.maxExperience);
  const modifiers = String(config.modifiers || '').replace(/[\r\n]/g, ' ').trim().slice(0, 180);

  if (!getCandidateOptions().some(candidate => candidate.id === candidateId)) throw new Error('Choose one of the available candidate profiles.');
  if (!Object.hasOwn(roleQueries, role)) throw new Error('Choose a valid role preset.');
  if (!Number.isInteger(target) || target < 1 || target > 20) throw new Error('Target applications must be between 1 and 20.');
  if (!Number.isInteger(maxExperience) || maxExperience < 0 || maxExperience > 30) throw new Error('Maximum experience must be between 0 and 30 years.');
  if (state.status === 'running') throw new Error('A search is already running.');
  if (!fs.existsSync(playwrightCli)) throw new Error('Playwright is not installed in this project. Run npm install first.');

  const query = [roleQueries[role], modifiers].filter(Boolean).join(' ');
  try { fs.unlinkSync(resultsPath); } catch {}
  state = { status: 'running', startedAt: new Date().toISOString(), finishedAt: null, matches: [], postsScanned: 0, log: '', error: null, config: { role, candidateId, date, target, maxExperience } };

  const child = spawn(process.execPath, [
    playwrightCli,
    'test', 'tests/linkedin-auto.spec.js',
    '--project=chromium', '--workers=1', '--reporter=line'
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DASHBOARD_DRY_RUN: '1',
      DASHBOARD_RESULTS_FILE: resultsPath,
      DASHBOARD_QUERY: query,
      DASHBOARD_DATE: date,
      DASHBOARD_TARGET: String(target),
      DASHBOARD_MAX_EXPERIENCE: String(maxExperience),
      DASHBOARD_EXPERIENCE_FILTER: config.experienceFilter === false ? '0' : '1',
      DASHBOARD_DOMAINS: roleDomains[role].join(','),
      DASHBOARD_ROLE_NAME: roleQueries[role].split(' ').slice(0, 2).join(' '),
      CANDIDATE: candidateId
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const appendLog = chunk => {
    state.log = (state.log + chunk.toString()).slice(-24000);
  };
  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);
  child.on('error', error => {
    state.status = 'failed';
    state.error = error.message;
    state.finishedAt = new Date().toISOString();
  });
  child.on('close', code => {
    try {
      if (fs.existsSync(resultsPath)) {
        const parsed = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        state.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
        state.postsScanned = Number(parsed.postsScanned) || 0;
      }
    } catch (error) {
      state.error = `Could not read search results: ${error.message}`;
    } finally {
      try { fs.unlinkSync(resultsPath); } catch {}
    }
    state.status = code === 0 ? 'complete' : 'failed';
    if (code !== 0 && !state.error) {
      if (state.log.includes('tests/login.json')) {
        state.error = 'LinkedIn session could not be loaded. Refresh the session with node tests/login.js, then try again.';
      } else {
        const diagnostics = state.log.split(/\r?\n/)
          .filter(line => /error|failed|timeout|executable|cannot find|no tests|config file|not found|err_/i.test(line))
          .slice(-4)
          .join(' ')
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
          .replace(/https?:\/\/[^\s"']+/g, '[url hidden]')
          .slice(-600);
        state.error = diagnostics || `Search exited with code ${code}.`;
      }
    }
    state.finishedAt = new Date().toISOString();
  });
}

async function sendReviewedOutreach(payload) {
  if (!['complete'].includes(state.status)) throw new Error('Complete a search before sending outreach.');
  const matchIndex = Number(payload.matchIndex);
  if (!Number.isInteger(matchIndex) || matchIndex < 0 || matchIndex >= state.matches.length) throw new Error('That match is no longer available. Refresh the search results.');
  const match = state.matches[matchIndex];
  if (match.outreachSent) throw new Error('An email has already been sent for this match.');
  const to = String(payload.to || '').trim();
  const subject = String(payload.subject || '').trim();
  const text = String(payload.text || '').trim();
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(to)) throw new Error('Enter a valid recipient email address.');
  if (!subject || subject.length > 180) throw new Error('Enter a subject of up to 180 characters.');
  if (!text || text.length > 12000) throw new Error('Enter a message of up to 12,000 characters.');
  if (!process.env.EMAIL || !process.env.EMAIL_PASS) throw new Error('Email is not configured. Add EMAIL and EMAIL_PASS (a Gmail app password) to the project .env, then restart the dashboard.');
  const candidate = selectCandidateForDashboard();
  const resumePath = path.resolve(projectRoot, candidate.resume);
  if (!resumePath.startsWith(projectRoot + path.sep) || !fs.existsSync(resumePath)) throw new Error('The selected candidate resume file is unavailable.');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS } });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      text,
      attachments: [{ filename: path.basename(resumePath), path: resumePath }]
    });
  } catch (error) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      throw new Error('Gmail rejected authentication. Use the account email and a Gmail App Password in EMAIL and EMAIL_PASS, then restart the dashboard.');
    }
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      throw new Error('Could not connect to Gmail. Check the network and try again.');
    }
    throw new Error('Gmail did not accept the message. Check the recipient and account settings, then try again.');
  }
  match.outreachSent = true;
  match.outreachRecipient = to;
  return { sent: true, message: `Email sent to ${to} with ${path.basename(resumePath)} attached.` };
}

function selectCandidateForDashboard() {
  const id = String(state.config?.candidateId || '2');
  return selectCandidateForId(id);
}

function selectCandidateForId(id) {
  const original = process.env.CANDIDATE;
  process.env.CANDIDATE = id;
  try { return selectCandidate(); }
  finally {
    if (original === undefined) delete process.env.CANDIDATE;
    else process.env.CANDIDATE = original;
  }
}

function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(staticRoot, requested);
  if (!filePath.startsWith(staticRoot + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
  response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  if (request.method === 'GET' && url.pathname === '/api/status') {
    const { status, startedAt, finishedAt, matches, postsScanned, error, config } = state;
    sendJson(response, 200, { status, startedAt, finishedAt, matches, postsScanned, error, config });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/candidates') {
    try {
      sendJson(response, 200, { candidates: getCandidateOptions() });
    } catch {
      sendJson(response, 503, { error: 'Could not read saved local candidate profiles.' });
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/search') {
    const origin = request.headers.origin;
    if (origin && ![`http://localhost:${port}`, `http://${host}:${port}`].includes(origin)) {
      sendJson(response, 403, { error: 'Requests must come from this local dashboard.' });
      return;
    }
    try {
      const config = await collectBody(request);
      startSearch(config);
      sendJson(response, 202, { status: state.status, message: 'Search started in search-only mode. No email will be sent.' });
    } catch (error) {
      sendJson(response, error.message === 'A search is already running.' ? 409 : 400, { error: error.message });
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/outreach') {
    const origin = request.headers.origin;
    if (origin && ![`http://localhost:${port}`, `http://${host}:${port}`].includes(origin)) {
      sendJson(response, 403, { error: 'Requests must come from this local dashboard.' });
      return;
    }
    try {
      const payload = await collectBody(request);
      const result = await sendReviewedOutreach(payload);
      sendJson(response, 200, result);
    } catch (error) {
      const statusCode = /not configured|unavailable|Complete a search|already been sent|no longer available/i.test(error.message) ? 409 : 400;
      sendJson(response, statusCode, { error: error.message });
    }
    return;
  }
  if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    serveStatic(request, response, url.pathname);
    return;
  }
  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(port, host, () => {
  console.log(`ReachOps dashboard running at http://${host}:${port}`);
  console.log('Search runs without sending. Outreach sends only after an explicit review action in the dashboard.');
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
