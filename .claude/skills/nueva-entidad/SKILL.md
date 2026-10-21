---
name: nueva-entidad
description: Add a new user-owned entity to Knowledge Connect end to end — Supabase migration with an owner column and RLS, applied with the CLI; API routes that use the user's session; a signed-in page with a form and a list; an admin panel; and a two-user check that each user sees only their own rows. Use when the user asks to add a new entity, table or record type that signed-in users create and see.
argument-hint: <entity name> <fields, e.g. "name text, priority (low|medium|high), due date">
---

# New entity

Builds a new user-owned record type the same way `knowledge` was built. The reference implementation is in the repo — read it before writing and copy its shape:

| Piece | Reference |
|---|---|
| Migration | `supabase/migrations/20261019120000_create_knowledge.sql` |
| Options, row type, column list | `lib/knowledge.ts` |
| Input checks | `parseText`, `parseChoice` in `lib/validation.ts` |
| User API | `app/api/knowledge/route.ts` |
| User page | `components/KnowledgeLibrary.tsx` + `app/(app)/(protected)/hub/page.tsx` |
| Admin API + panel | `app/api/admin/knowledge/route.ts`, `fetchAllRows`/`fetchUserEmails` in `lib/admin-data.ts`, `components/AdminDashboard.tsx` |

Follow `CLAUDE.md` throughout: English for code and copy, no new CSS or design, no test data left behind, no commit unless asked.

## Input

`$ARGUMENTS` gives the entity name and its fields. Before writing anything, settle:

- **Table name** (snake_case, plural or mass noun) and the **URL slug** for the page and API (`/api/<slug>`, `/<slug>`).
- For each field: type, required or optional, max length for text, and the allowed values for choice fields (keys in snake_case, labels for display).
- **Server-set fields** the user must not choose (like `status` defaulting to `pending_review`): their default and allowed values.
- Whether users may **edit or delete** their rows. Default: no — insert and read only.

If any of this is missing or ambiguous, ask with AskUserQuestion in one round, offering a recommended default for each. Do not guess allowed values.

## Steps

Keep a task list with these steps.

### 1. Migration

Create `supabase/migrations/<YYYYMMDDHHMMSS>_create_<table>.sql` (timestamp later than every existing migration). It must contain, in this order:

1. A header comment: what the table holds, who reads/writes it and through which routes.
2. `create table public.<table>` with
   - `id bigint generated always as identity primary key`
   - `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`
   - the user fields, each with a `check` that the API validation will mirror (`char_length(btrim(x)) between 1 and N` for text, `x in (...)` for choices)
   - server-set fields with their `default` and `check`
   - `created_at timestamptz not null default now()`
3. `create index <table>_user_id_created_at_idx on public.<table> (user_id, created_at desc);`
4. `alter table public.<table> enable row level security;`
5. Grants — Supabase grants everything on new public tables by default, so start from nothing:
   ```sql
   revoke all on public.<table> from anon, authenticated;
   grant select on public.<table> to authenticated;
   grant insert (<user fields only>) on public.<table> to authenticated;
   ```
   The column list on `insert` is what stops users setting `user_id` or server-set fields. If edits are allowed, add `grant update (<user fields only>)`; if deletes are allowed, `grant delete`.
6. Policies in the same migration, each `to authenticated` and keyed on `user_id = (select auth.uid())`: one `for select using (...)`, one `for insert with check (... and <server-set field> = <default>)`, plus `for update using (...) with check (...)` / `for delete using (...)` only when allowed.

Never edit a migration that has already been applied; fix forward with a new one.

### 2. Apply it

Read the URL from `.env.local` without printing it, then push:

```powershell
$line = Get-Content .env.local | Where-Object { $_ -match '^POSTGRES_URL_NON_POOLING=' } | Select-Object -First 1; $url = ($line -replace '^POSTGRES_URL_NON_POOLING=', '').Trim('"'); npx supabase db push --db-url "$url" --yes
```

This writes to the live database (there is no staging). Confirm the output lists only the new migration; if it lists others, stop and ask.

### 3. Shared options and validation

- `lib/<entity>.ts` (no `server-only` — the client imports it): option maps `{ key: 'Label' }` for each choice field, max lengths as constants, the row type, and `<ENTITY>_COLUMNS` (the select list, without `user_id`).
- Reuse `parseText` / `parseChoice` from `lib/validation.ts`. Add a new parser there only for a field type they cannot handle (dates, numbers), mirroring the table check.

### 4. API routes

`app/api/<slug>/route.ts`, modelled on `app/api/knowledge/route.ts`:

- Use `getSessionSupabase()` from `lib/supabase-session.ts` — never `lib/supabase-server.ts` here. Return 401 when `supabase.auth.getUser()` has no user.
- `GET`: select `<ENTITY>_COLUMNS` ordered by `created_at desc`. No `user_id` filter is needed; RLS applies it.
- `POST`: `readJsonObject`, validate each field with a user-facing 400 message, insert **only the named user fields**, `.select(<ENTITY>_COLUMNS).single()`, return `{ ok: true, row }`.
- `PATCH`/`DELETE` only if step 1 granted them.
- Add `'/api/<slug>/:path*'` to the `matcher` in `proxy.ts` (not to `PROTECTED`; the route answers 401 itself).

Admin (the project rule is that the admin sees everything): `app/api/admin/<slug>/route.ts` calling `requireAdmin()` first, then `fetchAllRows` and `fetchUserEmails` to return rows with an `owner` email instead of `user_id`.

### 5. Page with list and form

- `components/<Entity>Library.tsx` (client), modelled on `KnowledgeLibrary.tsx`: an `admin__panel` with the `form` (`form__field`, `form__label`, `form__input`, `<select className="form__input">` for choices, `btn btn--primary`, `form__status`), and an `admin__panel` with `admin__count`, loading/error/empty states and an `admin__table`. On success prepend the returned row and reset the form. Show labels from the option maps, never raw keys.
- The page goes under `app/(app)/(protected)/<slug>/page.tsx` so the protected layout checks the session. Add `'/<slug>'` to `PROTECTED` and `'/<slug>/:path*'` to the `matcher` in `proxy.ts`. Link to it from `/hub`.
- Admin: add a panel to `components/AdminDashboard.tsx` in the same style as the Knowledge panel, loading `/api/admin/<slug>`.

### 6. Docs

Update `CLAUDE.md`: the new table, its grants and policies under Database; the routes and page under Data flow; the proxy paths.

### 7. Verify

1. `npm run build` — must pass.
2. **Two-user RLS check** against the live database, inside a transaction that is always rolled back. Install `pg` in the scratchpad (never in the project) and run the bundled script, passing the table, a valid sample row of user fields, and any extra refusal checks:
   ```powershell
   $dir = "<scratchpad>\rls"; npm install --prefix $dir pg@8.13.1 --no-audit --no-fund --silent
   $line = Get-Content .env.local | Where-Object { $_ -match '^POSTGRES_URL_NON_POOLING=' } | Select-Object -First 1; $env:DB_URL = ($line -replace '^POSTGRES_URL_NON_POOLING=', '').Trim('"'); $env:NODE_PATH = "$dir\node_modules"
   node .claude/skills/nueva-entidad/rls-check.js <table> '<sample row JSON>' '<server-set fields JSON, e.g. {"status":"approved"}>'
   ```
   In Windows PowerShell 5.1, escape the quotes inside the JSON arguments or they are stripped: `'{\"name\":\"Doc\",\"kind\":\"sop\"}'`.
   It creates two temporary users A and B, and checks: each inserts a row and sees only their own; neither can set `user_id` or the server-set fields; update and delete are refused; `anon` can neither read nor insert. If edits/deletes were granted on purpose, expect those two lines to fail and confirm instead that a user cannot update or delete the other user's row. Every line must read `ok`; nothing is kept.
3. Browser, signed out, against the dev server (`preview_start` with `landing`, or the server already on port 3000 if it runs from this folder): `GET`/`POST /api/<slug>` and `/api/admin/<slug>` return 401, and `/<slug>` redirects to `/login?next=/<slug>`.
4. A signed-in walkthrough of the form writes to the live database — ask the user before doing it; if they agree, use a throwaway account and remove it and its rows afterwards.

Finish with `wrap_up`: what was built, that the migration is live, the check results, and that nothing is committed.
