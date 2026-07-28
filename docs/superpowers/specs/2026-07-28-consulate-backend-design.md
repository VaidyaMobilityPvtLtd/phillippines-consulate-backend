# Philippine Consulate Backend — Design Spec

**Date:** 2026-07-28  
**Status:** Approved for planning  
**Frontend:** `philippines-consulate` (Next.js)  
**Backend repo:** `phillippines-consulate-backend`

## Goal

Provide a backend API for the Philippine Consulate General (Kathmandu) website so that:

1. The public **news** section is served from the database (editable later via admin).
2. **Contact** and **feedback** form submissions are stored and viewable by admins.
3. A future admin panel can authenticate with JWT and manage news + submissions.

Static site content (visa pages, passport requirements, etc.) stays in the frontend and is out of scope.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (bcrypt password hashes) |
| Validation | Zod |

## Architecture

Standalone REST API, separate from the Next.js frontend. CORS restricted to the frontend origin via env.

### Public API (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/news` | List published news (newest first) |
| `GET` | `/api/news/:slug` | Single published news item |
| `POST` | `/api/contact` | Submit contact inquiry |
| `POST` | `/api/feedback` | Submit feedback |

### Auth

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Admin login → `{ token, user }` |
| `GET` | `/api/auth/me` | Current admin from JWT |

### Admin API (JWT required — `Authorization: Bearer <token>`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/news` | List all news (including drafts) |
| `POST` | `/api/admin/news` | Create news item |
| `PATCH` | `/api/admin/news/:id` | Update news item |
| `DELETE` | `/api/admin/news/:id` | Delete news item |
| `GET` | `/api/admin/contact` | List contact submissions |
| `PATCH` | `/api/admin/contact/:id` | Update status (`new` \| `read` \| `archived`) |
| `GET` | `/api/admin/feedback` | List feedback submissions |
| `PATCH` | `/api/admin/feedback/:id` | Update status (`new` \| `read` \| `archived`) |

### Out of scope

- Admin UI (built later against these APIs)
- Email notifications on form submit
- File uploads / news images
- Static content CMS

## Data models

### AdminUser

- `id` (uuid)
- `email` (unique)
- `passwordHash`
- `name`
- `createdAt`, `updatedAt`

### News

Aligned with frontend `NewsItem` in `content/news.ts`:

- `id` (uuid)
- `slug` (unique)
- `title`
- `date` (date — display/publish date)
- `category` — enum: `Announcement` \| `Advisory` \| `Notice`
- `summary` (string)
- `body` (string array / JSON)
- `published` (boolean, default `true`)
- `createdAt`, `updatedAt`

Public endpoints return only rows where `published === true`.

### ContactSubmission

Matches `ContactForm` fields:

- `id` (uuid)
- `name`, `email`, `phone` (optional)
- `topic` — enum: `visa` \| `passport` \| `registration` \| `appointment` \| `general`
- `subject`, `message`
- `status` — enum: `new` \| `read` \| `archived` (default `new`)
- `createdAt`

### FeedbackSubmission

Matches `FeedbackForm` fields:

- `id` (uuid)
- `firstName`, `lastName` (optional)
- `email`, `phone` (optional), `city` (optional), `country` (optional)
- `subject` (optional)
- `type` — enum: `Suggestions` \| `Comments` (default `Suggestions`)
- `message` (optional)
- `status` — enum: `new` \| `read` \| `archived` (default `new`)
- `createdAt`

## Auth details

- Login with email + password; compare against bcrypt hash.
- Issue JWT containing at least `sub` (user id) and `email`.
- Token expiry: 7 days (configurable via env).
- Secret from `JWT_SECRET` env var.
- Seed creates one admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and optional `ADMIN_NAME`).

## Validation & errors

- Zod schemas mirror frontend required/optional fields.
- Error response shape: `{ error: string, details?: unknown }` with appropriate HTTP status (400, 401, 404, 409, 429, 500).
- Rate limiting on `POST /api/contact` and `POST /api/feedback` to reduce spam.

## Seed data

1. One admin user from env credentials.
2. The four existing news items from the frontend `content/news.ts` so the public news page is populated immediately after migrate + seed.

## Project layout

```
src/
  index.ts          # server entry
  app.ts            # Express app setup
  routes/
    auth.ts
    news.ts         # public news
    contact.ts
    feedback.ts
    admin/
      news.ts
      contact.ts
      feedback.ts
  middleware/
    auth.ts
    errorHandler.ts
    rateLimit.ts
  services/
    auth.ts
    news.ts
    contact.ts
    feedback.ts
  validators/
    auth.ts
    news.ts
    contact.ts
    feedback.ts
prisma/
  schema.prisma
  seed.ts
  migrations/
```

## Environment

`.env.example`:

```
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=Admin
```

## Scripts

- `dev` — watch mode
- `build` / `start` — production
- `db:migrate` — Prisma migrate
- `db:seed` — seed admin + news
- `db:studio` — optional Prisma Studio

## Testing approach

- Manual / smoke checks for public and admin happy paths.
- Unit tests optional for validators and auth helpers if time allows; not a blocker for v1.

## Success criteria

- Frontend can fetch published news and submit contact/feedback against this API.
- Admin can log in with JWT and manage news + submission status.
- Postgres schema is migrated and seedable from a clean environment.
- CORS and env-based config support local Next.js + API development.
