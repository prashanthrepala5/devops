# LinkedIn Recruiter Outreach Automation

A Node.js and Playwright project for searching LinkedIn hiring posts, filtering posts against candidate profiles, preparing a highlighted resume, and contacting recruiters by email. It includes a local ReachOps dashboard for running searches and reviewing individual outreach messages.

> **Sending behavior:** The dashboard never sends email as part of a search. You review each live match and message, then explicitly confirm sending. Running the Playwright command directly uses the existing automation path, which can send emails automatically when it finds a matching post and email address. Use the dashboard if you want a review step.

## What it does

- Searches LinkedIn posts using a saved query, date filter, and candidate profile.
- Filters posts by role/domain, experience, location, hiring signals, and other configured criteria.
- Extracts skills and recruiter contact details that are present in a post. The CLI can also use Explorium as an email lookup fallback when configured.
- Creates a highlighted copy of the candidate's existing DOCX resume for the CLI email workflow.
- Sends outreach through Gmail using Nodemailer.
- Provides a local dashboard for search setup, live match review, and individually approved email sends.

## Requirements

- Node.js 20 or newer and npm.
- A LinkedIn account and a valid saved Playwright login session.
- Google Chrome installed to run dashboard searches. The regular CLI uses Playwright's Chromium browser.
- A Gmail account with an App Password to send email.
- An Explorium API key only if you want the CLI email lookup fallback.

## Install

From the project directory:

```sh
npm install
npx playwright install chromium
```

Create a `.env` file in the project root for email and optional CLI contact lookup:

```env
EMAIL=your-address@gmail.com
EMAIL_PASS=your_gmail_app_password
EXPLORIUM_API_KEY=your_explorium_api_key
```

`EMAIL` and `EMAIL_PASS` are used by the dashboard email sender and CLI. `EXPLORIUM_API_KEY` is optional and used by the CLI's email lookup fallback. Use a Gmail App Password, not your normal Gmail password. Keep `.env` private; it is ignored by Git.

## Sign in to LinkedIn

Create or refresh the local Playwright session:

```sh
node tests/login.js
```

A browser opens. Sign in to LinkedIn, finish any verification, reach your feed, then press **Enter** in the terminal. The session is saved to `tests/login.json` and reused by searches. Treat that file as a credential; it is ignored by Git. Run this command again if the session expires.

## Run the dashboard

Start the local server from the project root:

```sh
node dashboard/server.js
```

Open [http://localhost:8000](http://localhost:8000). Keep the terminal process running while you use it.

1. Select a role preset, candidate, date range, and search settings.
2. Start the search. The dashboard runs Playwright in search-only mode and loads the live matches into the review queue.
3. Open a live match and review the recipient, subject, and message. If the post did not include an email address, enter one manually.
4. Choose **Send reviewed email** and confirm. The selected candidate's existing resume is attached.

Search does not send email or run contact enrichment, and the dashboard does not generate a tailored resume. The sample summary cards and activity feed are illustrative; use the live match list for current search results. Email sending requires `EMAIL` and `EMAIL_PASS` in `.env` and a restart of the dashboard after changing them.

More dashboard details: [dashboard/README.md](dashboard/README.md).

## Run the CLI automation

To run the existing Playwright automation directly:

```sh
npx playwright test tests/linkedin-auto.spec.js --project=chromium --workers=1
```

The CLI uses `CANDIDATE` to select a profile (`1`, `2`, or `3`); it defaults to `1` (Mohammad Abdul Safi). For example:

```sh
CANDIDATE=2 npx playwright test tests/linkedin-auto.spec.js --project=chromium --workers=1
```

**The CLI path can send email without a dashboard review.** It sends when a matching post has an email address (from the post or the configured Explorium fallback), and attaches the generated highlighted resume. Confirm your candidate files, filters, and email configuration before running it.

## Candidate profiles

Candidate selection and filters are defined in [`tests/Candidate_Selector.js`](tests/Candidate_Selector.js). The candidate resume and profile details are stored in `resumes/` and `candidate_details/`.

| `CANDIDATE` | Profile |
| --- | --- |
| `1` | Mohammad Abdul Safi |
| `2` | Vijay Kumar |
| `3` | Reju Karkee |

The CLI uses the selected candidate's filters as its defaults. Dashboard searches use the selected candidate's profile and the dashboard form settings.

### Candidate upload portal

The Next.js profile portal is in [`reachops-portal/`](reachops-portal/README.md). Run it locally with `cd reachops-portal && npm install && npm run dev`, then open `http://localhost:3000`. It lets an operator create, edit, select, and remove named candidate profiles with PDF or DOCX resumes; saved local profiles also appear in the port-8000 dashboard selector and can be selected by ID with `CANDIDATE=<profile-id>`.

The portal stores files locally without sign-in or per-user access controls. Do not expose this local mode publicly. For Vercel, set the server-side `REACHOPS_API_BASE_URL` to an HTTPS Node backend that implements the profile API, authentication, owner-scoped database records, and private persistent object storage. The portal proxies requests to that service, but this repository has no deployed API URL or auth/database/storage integration configured. The Vercel frontend alone does not connect to or run the Playwright automation service; production search and outreach endpoints still need deployment.

## Search configuration

- Candidate defaults and filters: [`tests/Candidate_Selector.js`](tests/Candidate_Selector.js)
- Saved LinkedIn query read by the automation: [`tests/search-config.json`](tests/search-config.json)
- Dashboard role presets and validation: [`dashboard/server.js`](dashboard/server.js)
- Search, filtering, resume, and CLI email workflow: [`tests/linkedin-auto.spec.js`](tests/linkedin-auto.spec.js)

The standalone interactive helper can generate a query profile:

```sh
node search-keyword-builder.js
```

It writes a `search-config.json` at the project root. The automation currently reads `tests/search-config.json`; copy or adapt the generated query there if you want the CLI search to use it.

## Project layout

```text
candidate_details/          Candidate profile details
resumes/                    Candidate resume files
dashboard/                  ReachOps web dashboard and local API
tests/Candidate_Selector.js Candidate profiles and default filters
tests/linkedin-auto.spec.js Playwright search and CLI outreach workflow
tests/login.js              Interactive LinkedIn session setup
tests/search-config.json   Saved LinkedIn search query
resume-highlighting-workflow.js
                            Creates a highlighted resume for the CLI workflow
jd-skill-matcher.js         Matches job description skills
resume-highlighter.js       Highlights matched skills in a DOCX resume
```

## Troubleshooting

- **Dashboard page does not load:** Start `node dashboard/server.js` from the project root and leave it running. If port 8000 is occupied, set a different `PORT`, for example `PORT=8001 node dashboard/server.js`, then open that port.
- **Search cannot sign in or finds no posts:** Refresh `tests/login.json` with `node tests/login.js`, verify the session reaches the LinkedIn feed, then retry.
- **Dashboard search cannot launch Chrome:** Install Google Chrome. Dashboard-launched searches use the installed Chrome channel; CLI runs use Playwright Chromium.
- **Email button reports Gmail authentication failure:** Check `EMAIL` and `EMAIL_PASS` in the project-root `.env`. Use a Gmail App Password and restart the server after changing the file.
- **No recipient is detected:** The dashboard only uses an address found in the LinkedIn post; enter a verified address in the review form. CLI lookup fallback requires `EXPLORIUM_API_KEY`.
- **CLI reports missing resume or candidate details:** Check the selected candidate's paths in `tests/Candidate_Selector.js` and ensure the referenced files exist.

## Security and responsible use

- Never commit `.env`, `tests/login.json`, recruiter contact data, or private candidate documents.
- Review each recipient and email before sending from the dashboard. The dashboard attaches the selected candidate's existing resume, not a newly tailored resume.
- Use the LinkedIn automation in accordance with LinkedIn's terms and applicable privacy, anti-spam, and employment laws. Verify recipients and application details before contacting anyone.
