# Knowledge Connect

## Reaction

- **Understood:** That it is a virtual assistant that guides Paraíso Tropical employees.
- **Did not understand:** Whether it also works as a repository of documents and other resources.

Knowledge Connect is an enterprise knowledge management platform that helps
organizations connect employees with reliable company knowledge. Employees find
information, explore company resources, and get guidance on operational questions
and incidents through Maria, the platform's AI Knowledge Assistant.

This platform is designed to make company knowledge easier to find, use, and
maintain.

## Overview

Knowledge Connect brings an organization's operational knowledge together in one
place, so employees no longer need to search across scattered documents, inboxes,
and systems. It has two core parts:

- **Knowledge base** — a curated, maintained collection of company knowledge.
- **Maria — AI Knowledge Assistant** — the assistant inside the platform that
  answers questions and guides employees through operational situations using
  that knowledge base.

## Meet Maria

Maria is the AI Knowledge Assistant inside Knowledge Connect. She helps employees
find relevant knowledge, understand the information available, get
recommendations, and escalate requests when the available knowledge is
insufficient. Maria uses company knowledge from formal documents, emails, meeting
minutes, and other approved sources to help employees understand the appropriate
steps to follow when handling a question or incident.

### What Maria does

- Helps employees find relevant knowledge and answers day-to-day operational questions.
- Explains the information available and the appropriate steps to follow when
  handling a question or incident.
- Gives recommendations grounded in approved company knowledge.
- Points employees to the relevant source documents and resources.
- Escalates requests when the available knowledge is insufficient.

## Knowledge sources

| Source | Examples |
| --- | --- |
| Formal documents | Policies, procedures, manuals, guidelines |
| Emails | Internal communications, announcements, clarifications |
| Meeting minutes | Decisions, agreements, action items |
| Other approved sources | Additional materials vetted for accuracy |

## Language support

The current users, employees of the retail company Paraíso Tropical, are based in
Latin America. The platform is multilingual: employees can interact in
**English** or view information in **Spanish**, whichever they prefer.

All development and internal construction of the platform — code, documentation,
and this README — is done in **English**.

## Who it is for

Employees who need quick, reliable guidance during daily operations, and the
teams responsible for keeping company knowledge accurate and up to date.

## Goals

- Make company knowledge easier to **find**.
- Make company knowledge easier to **use** in daily work.
- Make company knowledge easier to **maintain** over time.

## Development

The site is a Next.js app (App Router, TypeScript).

```bash
npm install
npm run dev
```

Then open http://localhost:3000 (the admin page is at `/admin`).

- The feedback form posts to `/api/feedback`. That server route writes to Supabase
  with the secret key; the browser never does.
- Users sign in at `/login`; people without an account create one at `/register`.
- The admin page signs in with Supabase Auth and reads with the public key.
- Settings come from `.env.local` (not committed): `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only `NEXT_PUBLIC_*` values reach the browser.
- Anonymous visitors cannot write to the database directly; only the server routes can.

## First Impression

The user said he didn't understand some sections in the webpage. Specifically the tabs knowledge base and libraries, he said they are confusing.
