# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The app

- **Who uses it:** the employees of a retail company called Paraíso Tropical.
- **What it records (main entity):** Knowledge — documents that make up the company's knowledge, some formal and some informal. Maria, the chat assistant, uses these documents to guide employees.
- **Its data:**
  - Knowledge: ID, document name, path, knowledge type (formal rule, operational guide), source type (SOP, email, meeting), status.
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

Paraíso Tropical Knowledge Hub: a marketing landing page (waitlist + feedback forms) and a private admin page, backed by Supabase. Maria, the virtual assistant shown on the landing, is not implemented yet — the chat in the hero is static markup.

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
- `lib/supabase-server.ts` — secret key (`SUPABASE_SECRET_KEY`). It bypasses RLS. Used by the admin routes (`/api/admin/*`, through `lib/admin-data.ts`) and, as the one exception that predates the Project rules, by the landing form routes.

**Auth.** `/login` and `/register` render `components/AuthForm.tsx`, which POSTs to `/api/auth/login` and `/api/auth/register`; `components/LogoutButton.tsx` POSTs to `/api/auth/logout`. `proxy.ts` (Next.js 16's name for middleware) refreshes the session cookies and redirects signed-out visitors of `/hub` and `/admin` to `/login?next=…`; keep its `matcher` and `PROTECTED` list in step with new app paths. The check that counts is in `app/(app)/(protected)/layout.tsx`: put every signed-in page under that folder. `/hub` is a placeholder home.

**Admin gate.** `lib/admin.ts` compares the session email with `ADMIN_EMAILS` (comma-separated). `app/(admin)/admin/page.tsx` shows the dashboard only to admins, and each `/api/admin/*` route calls `requireAdmin()` before reading. `ADMIN_EMAILS` trusts the email on the account, and the Supabase project currently auto-confirms new emails — so only list addresses that already have an account, or turn on email confirmation first.

**Landing forms never talk to Supabase.** `SignupForm` and `FeedbackForm` use the `useSubmitForm` hook (`lib/submitForm.ts`) to POST JSON to `/api/signups` and `/api/feedback`. Those routes validate with `lib/validation.ts` and insert with the server client. Because the secret key skips RLS, the routes are the only gate: validation there must mirror the table check constraints, and only explicitly named columns are inserted. A duplicate signup (`23505`) is reported as success, and a filled `website` honeypot field returns success without writing.

### Database

Current state of `signups` and `feedback`: RLS enabled with no policies, and neither `anon` nor `authenticated` has any grant (see `20261012120000_lock_signups_and_feedback.sql`), so only the secret key reaches them. Never edit a migration that has already been applied.

### Environment

`.env.local` (git-ignored) supplies `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `ADMIN_EMAILS`. Only `NEXT_PUBLIC_*` values are bundled for the browser.

### Hosting

Nothing is deployed from this repo at the moment. The app needs a Node host because of the API routes, so it cannot be exported to static hosting such as GitHub Pages.
