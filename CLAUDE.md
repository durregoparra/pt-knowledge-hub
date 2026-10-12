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

### Two root layouts

`app/(site)/` and `app/(admin)/` are route groups, each with its own root `layout.tsx` (its own `<html>`/`<body>`). They exist because the admin page needs `<body class="admin">`. Both import `app/globals.css` and load Google Fonts through a `<link>` using `lib/fonts.ts` — a remote `@import` inside the CSS file is dropped by the bundler, so fonts must stay in the layouts.

### Styling

One global stylesheet, `app/globals.css`, with BEM-style class names (`hero__grid`, `btn--red`). It was ported unchanged from the original static site, and the pages were ported to match it element for element; keep markup and class names in sync with it rather than introducing another styling system. Scroll-in animations depend on `components/RevealObserver.tsx` adding `is-in` to every `.reveal` element.

### Data flow and the security boundary

This describes the code as it stands today, which predates the Project rules above and does not fully comply with them yet (the admin page reads from the browser, and the landing form routes use the secret key). New code follows the Project rules. There are two Supabase clients:

- `lib/supabase-server.ts` — secret key (`SUPABASE_SECRET_KEY`), marked `server-only`. Used only by the API routes. It bypasses RLS.
- `lib/supabase-browser.ts` — publishable key (`NEXT_PUBLIC_*`). Used only by the admin page.

**Landing forms never talk to Supabase.** `SignupForm` and `FeedbackForm` use the `useSubmitForm` hook (`lib/submitForm.ts`) to POST JSON to `/api/signups` and `/api/feedback`. Those routes validate with `lib/validation.ts` and insert with the server client. Because the secret key skips RLS, the routes are the only gate: validation there must mirror the table check constraints, and only explicitly named columns are inserted. A duplicate signup (`23505`) is reported as success, and a filled `website` honeypot field returns success without writing.

**The admin page** (`app/(admin)/admin/page.tsx`, a client component) signs in with Supabase Auth email/password and reads `signups` and `feedback` directly from the browser as the `authenticated` role, relying on RLS select policies.

### Database

Current state of `signups` and `feedback`: RLS enabled, `anon` has no insert permission (revoked in `20261010120000_revoke_anon_insert.sql`), `authenticated` can select and insert. Never edit a migration that has already been applied.

### Environment

`.env.local` (git-ignored) supplies `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only `NEXT_PUBLIC_*` values are bundled for the browser.

### Hosting

Nothing is deployed from this repo at the moment. The app needs a Node host because of the API routes, so it cannot be exported to static hosting such as GitHub Pages.
