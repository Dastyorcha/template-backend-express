# template-backend-express

A fork-ready Node.js + TypeScript + Express 5 + MongoDB backend starter. Ships a complete user auth flow and Claude Code infra out of the box.

## Tech stack

- **Node.js** + **TypeScript** (strict)
- **Express 5**
- **MongoDB** via Mongoose 8
- **JWT** authentication
- **bcrypt** password hashing
- **nodemailer** for email (verification codes, password reset)
- **zod** env validation
- **helmet** + **cors** + **express-rate-limit**
- **Vitest** tests (unit + integration with MongoDB Memory Server)
- **ESLint** + **Prettier** + **Husky** pre-commit hooks
- **Docker** + **docker-compose**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, and SMTP credentials
```

### 3. Start dev server

```bash
npm run dev
```

### Or start with Docker (MongoDB included)

```bash
docker compose up
```

## Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Hot-reload dev server via `tsx watch` |
| `npm run build`         | Compile TypeScript to `dist/`         |
| `npm run start`         | Run compiled output                   |
| `npm run typecheck`     | Type-check without emitting           |
| `npm run lint`          | Run ESLint                            |
| `npm run test`          | Run all tests                         |
| `npm run test:coverage` | Tests with coverage report            |

## API

Base path: `/api/users`

| Method | Path                         | Auth | Description                           |
| ------ | ---------------------------- | ---- | ------------------------------------- |
| POST   | `/register`                  | —    | Start registration (sends email code) |
| POST   | `/verify-email-for-register` | —    | Complete registration with code       |
| POST   | `/resend-code`               | —    | Resend verification code              |
| POST   | `/login`                     | —    | Login, returns JWT                    |
| POST   | `/forgot-password`           | —    | Send password reset code              |
| POST   | `/reset-password`            | —    | Reset password with code              |
| GET    | `/get-all-users`             | JWT  | Get all users                         |
| GET    | `/get-users-page`            | JWT  | Paginated users (`?page=1&size=10`)   |
| PUT    | `/update-user-credentials`   | JWT  | Update name/email (`?id=`)            |
| PUT    | `/change-password`           | JWT  | Change password (`?id=`)              |
| PUT    | `/toogle-block-user`         | JWT  | Block/unblock (`?id=&isBlocked=true`) |
| DELETE | `/delete-user`               | JWT  | Delete user (`?id=`)                  |

## Forking for a new project

See `docs/fork-checklist.md` for the full guide. The short version:

1. Update `package.json` name and `.env` credentials.
2. Swap or extend `src/models/user.model.ts` for your domain entity.
3. Use `/scaffold-resource <Name>` to add new resources.
4. Run `/code-review` before shipping.

## Claude Code

This template ships `.claude/` infrastructure:

- **10 hooks** — branch protection, doc-sync enforcement, auto-format, auto-PR
- **2 skills** — `backend-architect`, `api-security-reviewer`
- **4 commands** — `/code-review`, `/refactor`, `/scaffold-resource`, `/codemap`
- **`docs/`** — architecture, API reference, auth flow, env vars, fork checklist
