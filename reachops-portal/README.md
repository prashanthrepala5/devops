# ReachOps candidate portal

A Next.js portal for creating candidate profiles, choosing a job-profile category, uploading PDF/DOCX resumes, and reviewing saved submissions. Locally, saved profiles are available to the existing Playwright search through the dashboard candidate selector or `CANDIDATE=<profile-id>`.

## Local development

From this directory:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. The portal uses the parent automation project’s candidate files and writes new records under the ignored `reachops-portal/.local-data/` directory. Set `REACHOPS_DATA_DIR` to choose a different local data directory.

The local storage is a shared operator workspace. It has no sign-in or per-user access controls. Do not expose it to the public internet or use it for unrelated users’ resumes.

## Profile flow

- Create a profile with a name, job-profile category, and PDF or DOCX resume (up to 10 MB).
- Browse existing candidate records and locally created profiles.
- Edit a saved local profile, replace its resume, or delete it.
- Local profiles appear in the automation dashboard’s candidate dropdown and can be selected by ID in the CLI.

Available categories: Frontend / Web Development, Backend / Java, Full Stack, Data Engineering / Analytics, QA / Testing, DevOps / Cloud, Mobile Development, .NET, and Other / Custom.

The server validates the extension, size, and file signature. It does not parse the resume or claim inferred skills. PDF resumes are attached as-is by the CLI; DOCX resumes can use the existing skill-highlighting workflow.

## Vercel profile storage and user accounts

The Vercel build supports per-user Supabase Auth, Postgres, and a private Storage bucket. To enable profile creation and resume uploads:

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/setup.sql`](supabase/setup.sql). It creates the profile table, enables owner-only row policies, and creates a private resume bucket with PDF/DOCX and 10 MB limits.
3. Ensure Supabase's Data API is enabled. In Supabase Auth settings, enable email/password sign-in and set the Site URL to the deployed Vercel domain. Add the local and Vercel URLs to the redirect URL allowlist, and leave email confirmation enabled.
4. In Vercel → Project → Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project settings for Production and Preview. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted.
5. Redeploy the Vercel project. Visit `/login`, create an account, verify the email if Supabase requires it, then sign in.

The public publishable/anon key is safe to use in the browser only because the database and storage policies enforce ownership. Never add a Supabase service-role key to this app or a `NEXT_PUBLIC_` variable. The browser uploads the file directly to a short-lived, single-object signed upload URL, avoiding Vercel's request-body limit. The API verifies the uploaded PDF/DOCX signature and 10 MB limit before saving metadata. Each account can list, edit, replace, and delete only its own profiles.

The separate Node/Playwright automation still runs locally. Vercel profile storage does not start searches or send email, and saved cloud profiles are not yet synchronized to the local automation. For that, deploy a separate authenticated automation API and configure `REACHOPS_API_BASE_URL`; do not expose the local Playwright process directly.

For local development, the portal continues to use the ignored `.local-data` directory without sign-in, as described above. Copy `.env.example` only when setting up a hosted project; do not commit actual secrets.

## Local API routes

- `GET/POST /api/profiles` — list local profiles or create a profile with multipart `resume` and profile fields.
- `GET/PATCH/DELETE /api/profiles/:id` — read, update, or delete a locally saved profile.
- `POST /api/profiles/:id/resume` — replace that profile’s resume.
- `GET /api/candidates` — list built-in candidates, legacy local candidates, and managed local profiles for selectors.

These routes use local filesystem storage in development. On Vercel they use Supabase when the required environment variables and SQL policies are configured; requests require a signed-in user. Alternatively, when `REACHOPS_API_BASE_URL` is set, the profile API can proxy requests to a separately deployed backend that implements the same route and response contract and enforces authentication and ownership.

## Related files

- UI pages: `app/page.js`, `app/upload/page.js`, `app/submissions/page.js`
- Profile APIs and local store: `app/api/profiles/`, `lib/profile-store.js`
- Candidate categories: `lib/profile-categories.js`
- Playwright candidate mapping: `../tests/Candidate_Selector.js`
- Automation dashboard: `../dashboard/`
