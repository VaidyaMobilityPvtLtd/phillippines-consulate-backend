# Consulate Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Express + Prisma + PostgreSQL API that serves published news, accepts contact/feedback submissions, and exposes JWT-protected admin routes for news CRUD and submission management.

**Architecture:** Standalone TypeScript REST API. Public routes for news + forms; `/api/admin/*` behind JWT middleware. Prisma owns the schema/migrations; Zod validates all inputs; services own business logic; routes stay thin.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod, bcryptjs, jsonwebtoken, cors, express-rate-limit, dotenv, tsx, Vitest (validators only).

## Global Constraints

- Match design spec: `docs/superpowers/specs/2026-07-28-consulate-backend-design.md`
- Error shape always `{ error: string, details?: unknown }`
- Public news returns only `published: true`
- Contact topics: `visa` | `passport` | `registration` | `appointment` | `general`
- News categories: `Announcement` | `Advisory` | `Notice`
- Feedback types: `Suggestions` | `Comments`
- Submission statuses: `new` | `read` | `archived`
- No email sending, no file uploads, no admin UI
- Spec allows optional unit tests; include Vitest for Zod validators; verify APIs with curl after migrate/seed

---

## File Structure

```
package.json
tsconfig.json
.env.example
.gitignore
README.md
vitest.config.ts
prisma/
  schema.prisma
  seed.ts
src/
  index.ts
  app.ts
  config.ts
  lib/
    prisma.ts
    errors.ts
  middleware/
    auth.ts
    errorHandler.ts
    validate.ts
  validators/
    auth.ts
    news.ts
    contact.ts
    feedback.ts
  services/
    auth.ts
    news.ts
    contact.ts
    feedback.ts
  routes/
    auth.ts
    news.ts
    contact.ts
    feedback.ts
    admin/
      news.ts
      contact.ts
      feedback.ts
      index.ts
tests/
  validators/
    contact.test.ts
    news.test.ts
    auth.test.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `vitest.config.ts`, `src/config.ts`, `src/lib/errors.ts`, `src/lib/prisma.ts`

**Interfaces:**
- Produces: `config` object with `port`, `databaseUrl`, `jwtSecret`, `jwtExpiresIn`, `corsOrigin`, `adminEmail`, `adminPassword`, `adminName`
- Produces: `AppError` class (`statusCode`, `message`, `details?`)
- Produces: `prisma` singleton (`PrismaClient`)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "phillippines-consulate-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^6.12.0",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^5.1.0",
    "express-rate-limit": "^7.5.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^22.16.5",
    "prisma": "^6.12.0",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
.env
*.log
.DS_Store
```

- [ ] **Step 4: Create `.env.example`**

```
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/consulate?schema=public
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@consulate.local
ADMIN_PASSWORD=ChangeMeNow!
ADMIN_NAME=Admin
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Create `src/config.ts`**

```ts
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  adminEmail: required("ADMIN_EMAIL"),
  adminPassword: required("ADMIN_PASSWORD"),
  adminName: process.env.ADMIN_NAME ?? "Admin",
};
```

Note: `config.ts` is imported by the running server. For seed, read env directly so seed can run without throwing on unused vars. During scaffold, keep `required()` only for vars needed at runtime; seed will use `process.env` itself. Soften runtime config so `npm test` (validators) does not need a DB — validators must not import `config`.

Revised `src/config.ts` for server use only:

```ts
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
```

Admin env vars are only required in `prisma/seed.ts`, not at server boot.

- [ ] **Step 7: Create `src/lib/errors.ts`**

```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

- [ ] **Step 8: Create `src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`  
Expected: `package-lock.json` created; no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore .env.example vitest.config.ts src/config.ts src/lib/errors.ts src/lib/prisma.ts
git commit -m "chore: scaffold Express TypeScript project"
```

---

### Task 2: Prisma schema and initial migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: migration via Prisma CLI

**Interfaces:**
- Produces Prisma models: `AdminUser`, `News`, `ContactSubmission`, `FeedbackSubmission`
- Produces enums: `NewsCategory`, `ContactTopic`, `FeedbackType`, `SubmissionStatus`

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum NewsCategory {
  Announcement
  Advisory
  Notice
}

enum ContactTopic {
  visa
  passport
  registration
  appointment
  general
}

enum FeedbackType {
  Suggestions
  Comments
}

enum SubmissionStatus {
  new
  read
  archived
}

model AdminUser {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model News {
  id        String       @id @default(uuid())
  slug      String       @unique
  title     String
  date      DateTime     @db.Date
  category  NewsCategory
  summary   String
  body      String[]
  published Boolean      @default(true)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model ContactSubmission {
  id        String           @id @default(uuid())
  name      String
  email     String
  phone     String?
  topic     ContactTopic
  subject   String
  message   String
  status    SubmissionStatus @default(new)
  createdAt DateTime         @default(now())
}

model FeedbackSubmission {
  id        String           @id @default(uuid())
  firstName String
  lastName  String?
  email     String
  phone     String?
  city      String?
  country   String?
  subject   String?
  type      FeedbackType     @default(Suggestions)
  message   String?
  status    SubmissionStatus @default(new)
  createdAt DateTime         @default(now())
}
```

- [ ] **Step 2: Copy `.env.example` to `.env` and set a real `DATABASE_URL`**

Ensure local Postgres is running and the database exists (e.g. create DB `consulate`).

- [ ] **Step 3: Run migration**

Run: `npx prisma migrate dev --name init`  
Expected: migration folder created; Prisma Client generated.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema and initial migration"
```

Do **not** commit `.env`.

---

### Task 3: Express app shell, middleware, health check

**Files:**
- Create: `src/middleware/errorHandler.ts`, `src/middleware/validate.ts`, `src/app.ts`, `src/index.ts`

**Interfaces:**
- Produces: `createApp(): Express` — mounts JSON, CORS, routes later, error handler
- Produces: `validateBody(schema: ZodSchema)` middleware — sets `req.body` to parsed data or throws `AppError(400, ...)`
- Produces: `errorHandler` — maps `AppError` / Zod / unknown to JSON errors
- Produces: `GET /health` → `{ ok: true }`

- [ ] **Step 1: Create `src/middleware/validate.ts`**

```ts
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../lib/errors.js";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "Validation failed", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
```

- [ ] **Step 2: Create `src/middleware/errorHandler.ts`**

```ts
import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
```

- [ ] **Step 3: Create `src/app.ts`**

```ts
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // routes mounted in later tasks

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 4: Create `src/index.ts`**

```ts
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
```

- [ ] **Step 5: Smoke-test health**

Ensure `.env` has at least `JWT_SECRET` and `DATABASE_URL`.  
Run: `npx tsx src/index.ts` (then in another terminal)  
`curl http://localhost:4000/health`  
Expected: `{"ok":true}`  
Stop the server after.

- [ ] **Step 6: Commit**

```bash
git add src/app.ts src/index.ts src/middleware/errorHandler.ts src/middleware/validate.ts
git commit -m "feat: add Express app shell and error handling"
```

---

### Task 4: Auth validators, service, middleware, routes

**Files:**
- Create: `src/validators/auth.ts`, `src/services/auth.ts`, `src/middleware/auth.ts`, `src/routes/auth.ts`, `tests/validators/auth.test.ts`
- Modify: `src/app.ts` — mount `/api/auth`

**Interfaces:**
- Produces: `loginSchema` — `{ email: string, password: string }`
- Produces: `login(email, password) => { token: string, user: { id, email, name } }`
- Produces: `getUserById(id) => { id, email, name } | null`
- Produces: `requireAuth` middleware — sets `req.user = { id, email, name }` or `AppError(401)`
- Extends Express `Request` with optional `user`

- [ ] **Step 1: Write failing auth validator test**

Create `tests/validators/auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loginSchema } from "../../src/validators/auth.js";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@consulate.local",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/validators/auth.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/validators/auth.ts`**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- tests/validators/auth.test.ts`  
Expected: PASS

- [ ] **Step 5: Implement `src/services/auth.ts`**

```ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { config } from "../config.js";

export type AuthUser = { id: string; email: string; name: string };

type JwtPayload = { sub: string; email: string };

export async function login(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email } satisfies JwtPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions,
  );

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  return user;
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
```

- [ ] **Step 6: Implement `src/middleware/auth.ts`**

```ts
import type { RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { getUserById, verifyToken } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      throw new AppError(401, "Authentication required");
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 7: Implement `src/routes/auth.ts`**

```ts
import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema } from "../validators/auth.js";
import * as authService from "../services/auth.js";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});
```

- [ ] **Step 8: Mount auth in `src/app.ts`**

Add import and before `errorHandler`:

```ts
import { authRouter } from "./routes/auth.js";
// ...
app.use("/api/auth", authRouter);
```

- [ ] **Step 9: Commit**

```bash
git add src/validators/auth.ts src/services/auth.ts src/middleware/auth.ts src/routes/auth.ts src/app.ts tests/validators/auth.test.ts
git commit -m "feat: add JWT admin auth"
```

---

### Task 5: News validators, service, public + admin routes

**Files:**
- Create: `src/validators/news.ts`, `src/services/news.ts`, `src/routes/news.ts`, `src/routes/admin/news.ts`, `tests/validators/news.test.ts`
- Modify: `src/app.ts`

**Interfaces:**
- Produces: `createNewsSchema`, `updateNewsSchema` (partial create fields)
- Produces: `listPublishedNews()`, `getPublishedBySlug(slug)`, `listAllNews()`, `createNews(input)`, `updateNews(id, input)`, `deleteNews(id)`
- News JSON date serialized as `YYYY-MM-DD` string for frontend compatibility

- [ ] **Step 1: Write failing news validator test**

Create `tests/validators/news.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createNewsSchema } from "../../src/validators/news.js";

describe("createNewsSchema", () => {
  it("accepts a valid news item", () => {
    const result = createNewsSchema.safeParse({
      slug: "office-hours-reminder",
      title: "Consular office hours reminder",
      date: "2026-01-15",
      category: "Notice",
      summary: "Hours reminder",
      body: ["Paragraph one"],
      published: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = createNewsSchema.safeParse({
      slug: "x",
      title: "t",
      date: "2026-01-15",
      category: "Other",
      summary: "s",
      body: ["b"],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/validators/news.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement `src/validators/news.ts`**

```ts
import { z } from "zod";

export const newsCategorySchema = z.enum(["Announcement", "Advisory", "Notice"]);

export const createNewsSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: newsCategorySchema,
  summary: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  published: z.boolean().optional().default(true),
});

export const updateNewsSchema = createNewsSchema.partial();

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- tests/validators/news.test.ts`  
Expected: PASS

- [ ] **Step 5: Implement `src/services/news.ts`**

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateNewsInput, UpdateNewsInput } from "../validators/news.js";

function formatNews<T extends { date: Date }>(item: T) {
  return {
    ...item,
    date: item.date.toISOString().slice(0, 10),
  };
}

export async function listPublishedNews() {
  const items = await prisma.news.findMany({
    where: { published: true },
    orderBy: { date: "desc" },
  });
  return items.map(formatNews);
}

export async function getPublishedBySlug(slug: string) {
  const item = await prisma.news.findFirst({
    where: { slug, published: true },
  });
  if (!item) throw new AppError(404, "News item not found");
  return formatNews(item);
}

export async function listAllNews() {
  const items = await prisma.news.findMany({ orderBy: { date: "desc" } });
  return items.map(formatNews);
}

export async function createNews(input: CreateNewsInput) {
  try {
    const item = await prisma.news.create({
      data: {
        ...input,
        date: new Date(input.date),
      },
    });
    return formatNews(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "A news item with this slug already exists");
    }
    throw err;
  }
}

export async function updateNews(id: string, input: UpdateNewsInput) {
  try {
    const item = await prisma.news.update({
      where: { id },
      data: {
        ...input,
        ...(input.date ? { date: new Date(input.date) } : {}),
      },
    });
    return formatNews(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "News item not found");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "A news item with this slug already exists");
    }
    throw err;
  }
}

export async function deleteNews(id: string) {
  try {
    await prisma.news.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "News item not found");
    }
    throw err;
  }
}
```

- [ ] **Step 6: Implement public `src/routes/news.ts`**

```ts
import { Router } from "express";
import * as newsService from "../services/news.js";

export const newsRouter = Router();

newsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await newsService.listPublishedNews() });
  } catch (err) {
    next(err);
  }
});

newsRouter.get("/:slug", async (req, res, next) => {
  try {
    res.json({ item: await newsService.getPublishedBySlug(req.params.slug) });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 7: Implement `src/routes/admin/news.ts`**

```ts
import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { createNewsSchema, updateNewsSchema } from "../../validators/news.js";
import * as newsService from "../../services/news.js";

export const adminNewsRouter = Router();

adminNewsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await newsService.listAllNews() });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.post("/", validateBody(createNewsSchema), async (req, res, next) => {
  try {
    const item = await newsService.createNews(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.patch("/:id", validateBody(updateNewsSchema), async (req, res, next) => {
  try {
    const item = await newsService.updateNews(req.params.id, req.body);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.delete("/:id", async (req, res, next) => {
  try {
    await newsService.deleteNews(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 8: Create `src/routes/admin/index.ts` and mount routes in `src/app.ts`**

`src/routes/admin/index.ts`:

```ts
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { adminNewsRouter } from "./news.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use("/news", adminNewsRouter);
```

In `src/app.ts` add:

```ts
import { newsRouter } from "./routes/news.js";
import { adminRouter } from "./routes/admin/index.js";

app.use("/api/news", newsRouter);
app.use("/api/admin", adminRouter);
```

- [ ] **Step 9: Commit**

```bash
git add src/validators/news.ts src/services/news.ts src/routes/news.ts src/routes/admin/news.ts src/routes/admin/index.ts src/app.ts tests/validators/news.test.ts
git commit -m "feat: add public and admin news APIs"
```

---

### Task 6: Contact submissions (public + admin)

**Files:**
- Create: `src/validators/contact.ts`, `src/services/contact.ts`, `src/routes/contact.ts`, `src/routes/admin/contact.ts`, `tests/validators/contact.test.ts`
- Modify: `src/app.ts`, `src/routes/admin/index.ts`

**Interfaces:**
- Produces: `createContactSchema`, `updateContactStatusSchema` (`{ status }`)
- Produces: `createContact(input)`, `listContacts()`, `updateContactStatus(id, status)`
- Rate limit: 10 requests / 15 min per IP on `POST /api/contact`

- [ ] **Step 1: Write failing contact validator test**

Create `tests/validators/contact.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createContactSchema } from "../../src/validators/contact.js";

describe("createContactSchema", () => {
  it("accepts a valid contact payload", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+977 1 4008801",
      topic: "visa",
      subject: "Tourist visa",
      message: "I need guidance on requirements.",
    });
    expect(result.success).toBe(true);
  });

  it("requires topic", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      subject: "Hi",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/validators/contact.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement validators + service + routes**

`src/validators/contact.ts`:

```ts
import { z } from "zod";

export const contactTopicSchema = z.enum([
  "visa",
  "passport",
  "registration",
  "appointment",
  "general",
]);

export const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  topic: contactTopicSchema,
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
```

`src/services/contact.ts`:

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateContactInput } from "../validators/contact.js";
import type { SubmissionStatus } from "@prisma/client";

export async function createContact(input: CreateContactInput) {
  return prisma.contactSubmission.create({ data: input });
}

export async function listContacts() {
  return prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateContactStatus(id: string, status: SubmissionStatus) {
  try {
    return await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "Contact submission not found");
    }
    throw err;
  }
}
```

`src/routes/contact.ts`:

```ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { createContactSchema } from "../validators/contact.js";
import * as contactService from "../services/contact.js";

export const contactRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

contactRouter.post("/", limiter, validateBody(createContactSchema), async (req, res, next) => {
  try {
    const item = await contactService.createContact(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});
```

`src/routes/admin/contact.ts`:

```ts
import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { updateContactStatusSchema } from "../../validators/contact.js";
import * as contactService from "../../services/contact.js";

export const adminContactRouter = Router();

adminContactRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await contactService.listContacts() });
  } catch (err) {
    next(err);
  }
});

adminContactRouter.patch("/:id", validateBody(updateContactStatusSchema), async (req, res, next) => {
  try {
    const item = await contactService.updateContactStatus(req.params.id, req.body.status);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Mount contact routes**

In `src/app.ts`: `app.use("/api/contact", contactRouter);`  
In `src/routes/admin/index.ts`: `adminRouter.use("/contact", adminContactRouter);`

- [ ] **Step 5: Run validator tests**

Run: `npm test -- tests/validators/contact.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/validators/contact.ts src/services/contact.ts src/routes/contact.ts src/routes/admin/contact.ts src/routes/admin/index.ts src/app.ts tests/validators/contact.test.ts
git commit -m "feat: add contact submission APIs"
```

---

### Task 7: Feedback submissions (public + admin)

**Files:**
- Create: `src/validators/feedback.ts`, `src/services/feedback.ts`, `src/routes/feedback.ts`, `src/routes/admin/feedback.ts`
- Modify: `src/app.ts`, `src/routes/admin/index.ts`

**Interfaces:**
- Same pattern as contact: create public POST (rate limited), admin list + status PATCH
- `createFeedbackSchema` matches FeedbackForm fields

- [ ] **Step 1: Implement `src/validators/feedback.ts`**

```ts
import { z } from "zod";

export const createFeedbackSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  subject: z.string().optional(),
  type: z.enum(["Suggestions", "Comments"]).optional().default("Suggestions"),
  message: z.string().optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
```

- [ ] **Step 2: Implement `src/services/feedback.ts`**

```ts
import { Prisma, type SubmissionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateFeedbackInput } from "../validators/feedback.js";

export async function createFeedback(input: CreateFeedbackInput) {
  return prisma.feedbackSubmission.create({ data: input });
}

export async function listFeedback() {
  return prisma.feedbackSubmission.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateFeedbackStatus(id: string, status: SubmissionStatus) {
  try {
    return await prisma.feedbackSubmission.update({
      where: { id },
      data: { status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "Feedback submission not found");
    }
    throw err;
  }
}
```

- [ ] **Step 3: Implement public + admin feedback routes**

Mirror contact routes:
- Public: `POST /` with same rate limiter settings (10 / 15 min)
- Admin: `GET /`, `PATCH /:id` with status schema
- Mount at `/api/feedback` and `/api/admin/feedback`

- [ ] **Step 4: Commit**

```bash
git add src/validators/feedback.ts src/services/feedback.ts src/routes/feedback.ts src/routes/admin/feedback.ts src/routes/admin/index.ts src/app.ts
git commit -m "feat: add feedback submission APIs"
```

---

### Task 8: Seed data + README + end-to-end smoke

**Files:**
- Create: `prisma/seed.ts`, `README.md`
- Modify: ensure `package.json` prisma seed config already present from Task 1

**Interfaces:**
- Seed upserts admin by email and upserts 4 news items by slug (from frontend `content/news.ts`)

- [ ] **Step 1: Create `prisma/seed.ts`**

```ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newsItems = [
  {
    slug: "office-hours-reminder",
    title: "Consular office hours reminder",
    date: new Date("2026-01-15"),
    category: "Notice" as const,
    summary:
      "The Consulate General in Kathmandu receives clients Monday to Friday, 9:00 AM – 3:00 PM, with lunch break from 1:00 – 2:00 PM.",
    body: [
      "Please plan your visit within regular office hours. The Consulate is closed on Philippine and Nepali public holidays.",
      "For visa, passport, and civil registration inquiries, you may also email philcongen@voith.com.np or call +977-1-4008801 to 05.",
    ],
    published: true,
  },
  {
    slug: "passport-application-guidance",
    title: "Passport applications — personal appearance required",
    date: new Date("2025-11-20"),
    category: "Advisory" as const,
    summary:
      "All first-time, renewal, and lost-passport applicants must appear in person with complete documentary requirements.",
    body: [
      "Bring original documents and photocopies. Incomplete applications may delay processing.",
      "Passport fees are payable via deposit to Standard Chartered Bank Nepal Limited (A/C 01-0209171-01).",
      "See Passport Services for full requirement checklists.",
    ],
    published: true,
  },
  {
    slug: "visa-entry-reminder",
    title: "Visa and entry requirements for the Philippines",
    date: new Date("2025-09-08"),
    category: "Advisory" as const,
    summary:
      "Travelers should confirm visa-free eligibility, passport validity (at least six months), and supporting documents before departure.",
    body: [
      "Nationals of visa-free countries may generally stay up to 21 days for tourism or business, subject to immigration rules.",
      "Longer stays or other purposes require a visa from the Consulate before travel.",
      "Review Visa & Migration for categories, fees, and country lists.",
    ],
    published: true,
  },
  {
    slug: "civil-registration-abroad",
    title: "Report of birth, marriage, and death abroad",
    date: new Date("2025-06-12"),
    category: "Announcement" as const,
    summary:
      "Filipino nationals may report births, marriages, and deaths that occurred abroad through the Consulate’s registration services.",
    body: [
      "Timely reporting helps ensure civil registry records with the Philippine Statistics Authority.",
      "Contact the Consulate for forms and supporting document checklists.",
    ],
    published: true,
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  for (const item of newsItems) {
    await prisma.news.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }

  console.log("Seed complete: admin + news");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run seed**

Run: `npm run db:seed`  
Expected: `Seed complete: admin + news`

- [ ] **Step 3: Write `README.md`**

Include: prerequisites (Node 20+, Postgres), setup (`cp .env.example .env`, `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`), endpoint summary table from the design spec, example curl for login + news list + contact submit.

- [ ] **Step 4: End-to-end smoke (server running via `npm run dev`)**

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/news
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@consulate.local\",\"password\":\"ChangeMeNow!\"}"
# save TOKEN from response, then:
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer TOKEN"
curl -X POST http://localhost:4000/api/contact -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"email\":\"t@example.com\",\"topic\":\"general\",\"subject\":\"Hi\",\"message\":\"Hello\"}"
curl -X POST http://localhost:4000/api/feedback -H "Content-Type: application/json" -d "{\"firstName\":\"Test\",\"email\":\"t@example.com\",\"type\":\"Suggestions\",\"message\":\"Nice site\"}"
curl http://localhost:4000/api/admin/contact -H "Authorization: Bearer TOKEN"
curl http://localhost:4000/api/admin/feedback -H "Authorization: Bearer TOKEN"
```

Expected: health ok; 4 news items; login returns token; me returns user; contact/feedback 201; admin lists include new rows.

- [ ] **Step 5: Run all validator tests**

Run: `npm test`  
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts README.md
git commit -m "feat: add seed data and README"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Public news list/detail | Task 5 |
| Contact POST | Task 6 |
| Feedback POST | Task 7 |
| JWT login + `/me` | Task 4 |
| Admin news CRUD | Task 5 |
| Admin contact/feedback list + status | Tasks 6–7 |
| Prisma models + enums | Task 2 |
| Rate limiting on form POSTs | Tasks 6–7 |
| Seed admin + 4 news items | Task 8 |
| CORS + env config | Tasks 1, 3 |
| Error shape | Task 3 |
| No email / no admin UI / no uploads | Global constraints |

## Self-review notes

- No TBD placeholders.
- Date format for news API is `YYYY-MM-DD` to match frontend `NewsItem.date`.
- Admin env vars required only at seed time, not server boot (avoids test friction).
- `express` v5 used; if install fails on platform, pin to `express@4` and keep the same route code.
