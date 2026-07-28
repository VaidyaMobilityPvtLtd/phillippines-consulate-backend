# Philippines Consulate Backend

REST API for the Philippine Consulate General (Kathmandu) website — public news, contact/feedback submissions, and JWT-protected admin endpoints.

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (local install or Docker)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set at minimum: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run database migrations:

   ```bash
   npm run db:migrate
   ```

4. Seed admin user and news items:

   ```bash
   npm run db:seed
   ```

   Expected output: `Seed complete: admin + news`

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:4000` by default (`PORT` env).

### Docker Postgres (optional)

```bash
docker run -d --name consulate-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=consulate \
  -p 5432:5432 \
  postgres:16
```

Use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/consulate?schema=public` in `.env`.

## API Endpoints

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `GET` | `/api/news` | List published news (newest first) |
| `GET` | `/api/news/:slug` | Single published news item |
| `POST` | `/api/contact` | Submit contact inquiry |
| `POST` | `/api/feedback` | Submit feedback |

### Auth

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Admin login → `{ token, user }` |
| `GET` | `/api/auth/me` | Current admin from JWT |

### Admin (JWT required — `Authorization: Bearer <token>`)

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

## Example requests

### Health check

```bash
curl http://localhost:4000/health
```

### List published news

```bash
curl http://localhost:4000/api/news
```

### Admin login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@consulate.local","password":"ChangeMeNow!"}'
```

Save the `token` from the response for admin requests.

### Current admin user

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Submit contact form

```bash
curl -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@example.com","topic":"general","subject":"Hi","message":"Hello"}'
```

### Submit feedback

```bash
curl -X POST http://localhost:4000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","email":"t@example.com","type":"Suggestions","message":"Nice site"}'
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed admin + news data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run validator unit tests |

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `4000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (default `7d`) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `ADMIN_EMAIL` | Admin email (used by seed) |
| `ADMIN_PASSWORD` | Admin password (used by seed) |
| `ADMIN_NAME` | Admin display name (optional, default `Admin`) |
