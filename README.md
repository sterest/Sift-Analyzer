# Sift

Upload a CSV, Excel, TSV or JSON file and get plain-language findings, column profiles, correlations and a dashboard you can filter and save. Accounts keep each person's files and saved dashboard views private.

## Stack

- **Next.js 16** (App Router, TypeScript, Cache Components) for the site and server actions
- **Supabase** for accounts (email and password), the Postgres database and private file storage
- **Vercel** for hosting (recommended)
- Parsing and analysis run in the browser: `papaparse` for CSV, `read-excel-file` for Excel

## Project layout

| Path | What it holds |
|---|---|
| `src/lib/analyze.ts` | Column typing, statistics, correlations and the written findings |
| `src/lib/aggregate.ts` | Grouping by time and category, histograms |
| `src/lib/parse-file.ts` | Reading CSV / TSV / JSON / Excel into rows |
| `src/components/` | Charts, the Dashboard and Analysis views, the file picker, the site header |
| `src/app/page.tsx` | Home page |
| `src/app/try/` | Analyze a file without an account (nothing is uploaded) |
| `src/app/(auth)/` | Sign in, sign up, password reset and their server actions |
| `src/app/app/` | Signed-in area: your datasets, upload, the dataset page with saved views |
| `src/app/auth/confirm/route.ts` | Where links in Supabase emails land |
| `src/proxy.ts` | Refreshes the session cookie and keeps signed-out visitors out of `/app` |
| `supabase/schema.sql` | Tables, row-level security and the storage bucket |

## Run it locally

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The home page and **Try it** work straight away. Account pages show setup steps until Supabase is connected.

## Connect accounts (Supabase)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor**, paste in `supabase/schema.sql` and run it. It creates the `datasets` and `dashboards` tables, turns on row-level security so each person sees only their own rows, and creates a private `datasets` storage bucket (25 MB per file).
3. Copy `.env.example` to `.env.local`. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings → API Keys**. Use the publishable (or "anon") key, never the secret or service-role key.
4. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` for now, and add `http://localhost:3000/**` to **Redirect URLs**.
5. Restart `npm run dev`, create an account and confirm it from the email.

## Google sign-in

The sign-in and sign-up pages have a **Continue with Google** button. It goes through Supabase, so Google needs one setting in Google Cloud and one in Supabase:

1. In **Google Cloud Console** (console.cloud.google.com), create a project, then go to **Google Auth Platform**:
   - **Branding / OAuth consent screen:** app name "Sift", your support email, audience **External**. Add the privacy policy link `https://sift-analyzer-pi.vercel.app/privacy`.
   - **Clients → Create client → Web application.** Under **Authorized redirect URIs** add `https://<your-project-ref>.supabase.co/auth/v1/callback`; Supabase shows this exact address on its Google provider page.
   - Copy the **Client ID** and **Client secret**.
   - Under **Audience**, click **Publish app**. While it's in "Testing", only the test users you list can sign in.
2. In **Supabase → Authentication → Sign In / Providers → Google**, turn it on and paste the client ID and secret. Never put the client secret in this project's files.
3. In **Supabase → Authentication → URL Configuration**, set **Site URL** to `https://sift-analyzer-pi.vercel.app` and add both `https://sift-analyzer-pi.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.

Sift asks Google only for the basic sign-in details (email, name, picture), so Google doesn't require an app review.

## Deploy (Vercel)

`scripts/deploy-vercel.ps1` publishes with a Vercel access token you paste in (it isn't stored). When `.env.local` holds the Supabase URL and publishable key, the script copies them to the Vercel project before building.

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-vercel.ps1
```

Alternatively, connect a GitHub repository:

1. Put the project in a Git repository and push it to GitHub.
2. Import the repository in Vercel. Add the same two `NEXT_PUBLIC_SUPABASE_*` variables, plus `NEXT_PUBLIC_SITE_URL` set to the live address.
3. In Supabase **URL Configuration**, change **Site URL** to the live address and add `https://<your-domain>/**` to **Redirect URLs**.
4. Supabase's built-in email sender is rate-limited and meant for testing. Before real users sign up, set up your own SMTP provider under **Authentication → Emails**.

## Privacy policy

The policy lives at `/privacy` (`src/app/privacy/page.tsx`). The operator's details it needs (name, address, contact email, country, regulator, Supabase region, effective date) are in `src/lib/legal.ts`. Until every placeholder there is filled in, the page shows a draft notice. Have the final text reviewed by someone who knows the data protection law that applies to you.

If you change what the app collects or who it shares data with (analytics, a new email provider, the Claude API), update the policy in the same change.

People can download a summary of their data and delete their account at `/app/account`. Deleting an account relies on the `delete_my_account()` function in `supabase/schema.sql`. If you ran the schema before that function was added, run the file again; it is safe to re-run.

## How data is protected

- Uploaded files go to a private bucket, in a folder named after the owner's user id. Storage policies only let that user read, upload or delete there.
- Every table has row-level security keyed on `auth.uid()`, so a request can only reach its own rows whatever the browser sends.
- Files on the **Try it** page never leave the browser.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Planned next

- Ask questions about a dataset in plain English (Claude API, called from a server route so the key stays secret)
- Export a dashboard as PNG or PDF, and tables as CSV
- Automated tests for `src/lib/analyze.ts` and the upload flow
- Handling for very large files (background parsing, DuckDB-WASM)
