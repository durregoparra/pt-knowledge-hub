# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The app

- **What it is:** Knowledge Connect, an enterprise knowledge management platform that helps organizations connect employees with reliable company knowledge. Maria — AI Knowledge Assistant — is the assistant inside the platform (never the platform's name).
- **Who uses it:** the employees of a retail company called Paraíso Tropical.
- **What it records (main entity):** Knowledge — documents that make up the company's knowledge, some formal and some informal. Maria uses these documents to help employees find relevant knowledge, understand it, get recommendations, and escalate requests when the knowledge is insufficient.
- **Its data:**
  - Knowledge: ID, document name, path, knowledge type (formal rule, operational guide), source type (SOP, email, meeting), status.
  - Company: company ID, company name, admin email. Every user registers into one company; the first to name it is its administrator.
- **Who sees what:** a user sees only their own records; the admin sees everything.

## Project rules

- Next.js with API routes. The browser never talks to the database.
- The secret key is used only in the admin panel routes.
- The admin panel is only for the emails listed in `ADMIN_EMAILS`.
- App routes query the database with the publishable key and the user's session, always on the server, so that RLS applies.
- Every new table has RLS enabled, with its policies in the same migration.
- Database changes go in as a migration in `supabase/migrations/`, and you apply them yourself with the Supabase CLI.
- Do not change the design unless asked.
- Do not commit or load test data unless asked.
- It is a prototype: payments and AI are simulated.

## Project

Knowledge Connect: a marketing landing page (with a feedback form), a signed-in hub (`/hub`) where employees register knowledge documents, and a private admin page, backed by Supabase. Maria, the AI Knowledge Assistant shown on the landing, is not implemented yet — the chat in the hero is static markup.

All code, comments, docs and site copy are written in **English**, even though the owner works in Spanish.

## Commands

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build; also the only type check
npm run start   # serve the production build on port 3000
```

There is no linter and no test suite. `npm run build` is the check to run after changes.

The Supabase CLI is not installed globally; run it through `npx supabase`. The project is not linked, so pass the database URL from `.env.local` explicitly:

```bash
npx supabase migration list --db-url "<POSTGRES_URL_NON_POOLING>"
npx supabase db push --db-url "<POSTGRES_URL_NON_POOLING>"
```

`db push` applies to the live database — there is no local or staging instance.

On this Windows machine `git` is not on PATH; it ships with GitHub Desktop under `%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.

## Architecture

Next.js App Router with TypeScript, at the repo root. Import alias `@/*` maps to the root.

### Three root layouts

`app/(site)/` (landing), `app/(app)/` (login, register and the signed-in pages) and `app/(admin)/` are route groups, each with its own root `layout.tsx` (its own `<html>`/`<body>`). They exist because the app and admin pages need `<body class="admin">`. Moving between groups is a full page load, so auth code navigates with `window.location`. All import `app/globals.css` and load Google Fonts through a `<link>` using `lib/fonts.ts` — a remote `@import` inside the CSS file is dropped by the bundler, so fonts must stay in the layouts.

### Styling

One global stylesheet, `app/globals.css`, with BEM-style class names (`hero__grid`, `btn--red`). It was ported unchanged from the original static site, and the pages were ported to match it element for element; keep markup and class names in sync with it rather than introducing another styling system. Scroll-in animations depend on `components/RevealObserver.tsx` adding `is-in` to every `.reveal` element.

### Data flow and the security boundary

There is no Supabase client in the browser. There are two on the server, both marked `server-only`:

- `lib/supabase-session.ts` — publishable key plus the user's session, kept in cookies by `@supabase/ssr`, so RLS applies. Used by the auth routes and by pages to read the signed-in user (`getSessionUser()`).
- `lib/supabase-server.ts` — secret key (`SUPABASE_SECRET_KEY`). It bypasses RLS. Used by the admin routes (`/api/admin/*`, through `lib/admin-data.ts`) and, as the one exception that predates the Project rules, by the landing feedback route.

**Auth.** `/login` and `/register` render `components/AuthForm.tsx`, which POSTs to `/api/auth/login` and `/api/auth/register`; the login page links to `/register` for people without an account. (The landing waitlist, "Get early access", was removed; account registration stays.) `components/LogoutButton.tsx` POSTs to `/api/auth/logout`. `proxy.ts` (Next.js 16's name for middleware) refreshes the session cookies and redirects signed-out visitors of `/hub` and `/admin` to `/login?next=…`; keep its `matcher` and `PROTECTED` list in step with new app paths. The check that counts is in `app/(app)/(protected)/layout.tsx`: put every signed-in page under that folder. The matcher also covers `/api/knowledge` (to refresh cookies; the route answers 401 itself rather than redirecting).

**Companies.** The register form also asks for the company. While the person types, it POSTs the name to `/api/companies/check`, which calls the `company_exists()` RPC through the session client and answers only `exists: true/false`; the form shows the "will be created, you will be its administrator" or "you'll be a regular user" message from `lib/company.ts`. There is deliberately no list of companies to pick from, since that would show visitors other companies' names. `/api/auth/register` validates the name with `parseCompanyName()` and passes it to `signUp` as user metadata `company_name`; the `link_new_user_to_company()` trigger on `auth.users` does the rest inside the account insert (see Database). The route then reads the outcome back with `getMyCompany()` (`lib/company-membership.ts`, session client) and returns it, and the form confirms it before a Continue link; the hub shows the same line. The company administrator (`company_members.is_admin`) is unrelated to the platform admin in `ADMIN_EMAILS`. The admin panel lists companies with their administrator and user count through `/api/admin/companies`.

**Knowledge.** `/hub` renders `components/KnowledgeLibrary.tsx`, which GETs and POSTs `/api/knowledge`. That route uses `getSessionSupabase()`, so RLS limits it to the user's own rows; it validates with `lib/validation.ts` and inserts only `name`, `path`, `knowledge_type` and `source_type`. Option keys and labels live in `lib/knowledge.ts` and must match the table check constraints. The admin reads every document through `/api/admin/knowledge`, which adds each owner's email via `fetchUserEmails()` and the owner's company via `fetchMemberships()` in `lib/admin-data.ts` (a document's company is its owner's company; `knowledge` has no company column).

**Visits and metrics.** `app/(app)/(protected)/layout.tsx` calls `recordVisit()` (`lib/visits.ts`, session client) on every signed-in page load, adding one `visits` row per user per UTC day; a repeat the same day hits the primary key (23505) and is ignored — it is a plain insert because an upsert would need a select grant — and any other failure is only logged. `/admin/metricas` (`app/(admin)/admin/metricas/page.tsx`, linked from the admin panel) renders `components/AdminMetrics.tsx`, which GETs `/api/admin/metrics`; what each metric means and how it is computed is in the Metrics section below. The weekly chart is plain SVG with a table view; no chart library.

**Admin gate.** `lib/admin.ts` compares the session email with `ADMIN_EMAILS` (comma-separated). `app/(admin)/admin/page.tsx` shows the dashboard only to admins, and each `/api/admin/*` route calls `requireAdmin()` before reading. The dashboard (`components/AdminDashboard.tsx`) has four tabs: Knowledge, Companies, Users (`/api/admin/users`: every account with its company and role) and Feedback. The landing nav's person icon links to `/login`. `ADMIN_EMAILS` trusts the email on the account, and the Supabase project currently auto-confirms new emails — so only list addresses that already have an account, or turn on email confirmation first.

**The landing form never talks to Supabase.** `FeedbackForm` uses the `useSubmitForm` hook (`lib/submitForm.ts`) to POST JSON to `/api/feedback`. That route validates with `lib/validation.ts` and inserts with the server client. Because the secret key skips RLS, the route is the only gate: validation there must mirror the table check constraints, and only explicitly named columns are inserted. A filled `website` honeypot field returns success without writing.

### Database

`feedback`: RLS enabled with no policies, and neither `anon` nor `authenticated` has any grant (see `20261012120000_lock_signups_and_feedback.sql`), so only the secret key reaches it. The waitlist table `signups` was dropped by `20261021120000_drop_signups.sql`.

`knowledge` (`20261019120000_create_knowledge.sql`): `user_id` defaults to `auth.uid()` and `status` to `pending_review`. `authenticated` has `select` and a column-level `insert` on the four user fields only, so users cannot set the owner or the status; policies allow selecting and inserting only rows where `user_id = auth.uid()`. There is no update or delete yet. `anon` has no grant.

`companies` and `company_members` (`20261020130000_create_companies.sql`): `companies` has exactly `company_id` (identity), `company_name` and `admin_email`, with a unique index on `normalize_company_name(company_name)` (lower case, Spanish accents folded, periods/apostrophes dropped, other punctuation and whitespace collapsed), so "Paraíso Tropical S.A." and "paraiso  tropical sa" are one company, also under concurrent sign-ups. `company_members` has one row per user (`user_id` primary key, cascades from `auth.users`), `company_id` (restrict on delete) and `is_admin`, with at most one admin per company. Both tables have RLS; `authenticated` has `select` only, and policies show a user only their own membership and their own company; `anon` has nothing, and no role can insert, update or delete. Writes happen only in the `security definer` trigger `link_new_user_to_company()` (after insert on `auth.users`): it refuses an account without a valid `company_name` in its metadata, inserts the company with `on conflict do nothing` and `admin_email` = the new account's email, and links the user as admin if it created the company, as a regular user otherwise. Because it runs in the account's own transaction, a failed sign-up leaves no company behind. Consequences: accounts created from the Supabase dashboard need `company_name` metadata or they fail, and the hub shows no company line for an account without a membership. `20261020140000_backfill_paraiso_tropical.sql` created the company Paraíso Tropical (administrator `viviana@test.com`) and linked every account that existed before companies to it. `20261021130000_unlink_platform_admin.sql` then removed the platform administrator (diana.urrego.parra@gmail.com) from it: the platform admin belongs to no company, so the admin Users tab shows "—" for it. `company_exists(name)` is `security definer`, executable by `anon` and `authenticated`, and returns only a boolean.

`visits` (`20261021140000_create_visits.sql`): primary key `(user_id, visited_on)`, `user_id` defaults to `auth.uid()`, `visited_on` to today in UTC. `authenticated` has only a column-level `insert` on `user_id`, and the policy allows a row only for the user's own id and today's date, so users cannot backdate visits or read any rows; `anon` has nothing. Only the admin reads it, with the secret key. Visits were not recorded before this table, so return counts start on 2026-10-21.

A knowledge versions feature (`20261019130000_create_knowledge_versions.sql`) was added and then removed by `20261020120000_drop_knowledge_versions.sql`; neither its table, functions nor the unique index it put on `knowledge` exist any more.

Never edit a migration that has already been applied.

### Environment

`.env.local` (git-ignored) supplies `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `ADMIN_EMAILS`. Only `NEXT_PUBLIC_*` values are bundled for the browser.

### Hosting

Nothing is deployed from this repo at the moment. The app needs a Node host because of the API routes, so it cannot be exported to static hosting such as GitHub Pages.

## Metrics

The prototype exists to test demand: how many companies are interested, how much knowledge they would load and of what kind, and how many users would come back to use Maria. `/admin/metricas` shows the metrics below, all computed in `app/api/admin/metrics/route.ts` from data the app already stores. Only rows of existing accounts count. Days and weeks are UTC; weeks start on Monday. A rate whose denominator is 0 shows 0%.

| Metric | Question it answers | How it is computed |
|---|---|---|
| **Registered users** | How many people signed up? | Number of accounts in Supabase Auth. |
| **Activation** | Do people who sign up actually load knowledge? | Distinct owners of `knowledge` rows ÷ registered users. |
| **Return** | Do people come back? | Users with `visits` rows on two or more days ÷ registered users. Counts start on 2026-10-21, when `visits` was created. |
| **Documents per company** | How big is a company's knowledge base, and therefore what would it cost to serve? | Median number of documents per company, over every company that has members, including companies with no documents. Each document counts under its owner's company (`company_members`); documents of users without a company, such as the platform admin, are left out. The note also shows how many companies have at least one document. |
| **Everyday knowledge** | Is what people load informal, day-to-day knowledge, or only official procedures? | Documents with `knowledge_type = operational_guide` or `source_type` `email` or `meeting` ÷ all documents. |
| **Per week** (chart, last 12 weeks) | Is sign-up and usage growing? | New users: accounts whose `created_at` falls in the week. Users who entered the app: distinct users with a `visits` row in the week. |

The database does not store document size, so the size of a company's knowledge source cannot be measured yet.
