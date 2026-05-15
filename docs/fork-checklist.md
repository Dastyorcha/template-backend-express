# Fork checklist

Step-by-step guide for turning this template into your own project.

## Phase 0 — Pre-flight decisions

- **Project name** (e.g. `my-api`)
- **MongoDB database name** (e.g. `my-api-prod`)
- **Primary domain / API base URL**
- **SMTP provider** (Gmail app password, SendGrid, Resend, etc.)
- **Auth token lifetimes** — `ACCESS_TOKEN_EXPIRY` (default `15m`) and `REFRESH_TOKEN_EXPIRY` (default `7d`)

## Phase 1 — Package identity

`package.json` — update `name`, `version`, `description`, `author`.

## Phase 2 — Environment

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` to your database (local or Atlas).
3. Generate a strong `JWT_SECRET`: `openssl rand -hex 32`.
4. Generate a strong `REFRESH_TOKEN_SECRET`: `openssl rand -hex 32`.
5. Set `REDIS_URL` to your Redis instance (local: `redis://localhost:6379`).
6. Set `CORS_ORIGIN` to your frontend URL.
7. Configure `EMAIL_*` vars for your SMTP provider.
8. Adjust `ACCESS_TOKEN_EXPIRY` and `REFRESH_TOKEN_EXPIRY` if needed.

## Phase 3 — Start Redis

```bash
docker compose up          # starts MongoDB + Redis + API together
# or for Redis only:
docker run -d -p 6379:6379 redis:7-alpine
```

## Phase 4 — Domain model

**Option A — Extend User**: add fields to `src/models/user.model.ts`. Update `docs/data-model.md`.

**Option B — Replace**: create your model with `/scaffold-resource <YourEntity>`. Delete the User model, controllers, and routes.

## Phase 5 — Email templates

`src/utils/email-templates.ts` — update brand name, color `#268ACA`, sender name in both templates.

## Phase 6 — Auth decisions

- Keep or remove the two-step email verification flow.
- Adjust token lifetimes in `.env`.
- Redis is already wired — no changes needed for multi-instance deployments.

## Phase 7 — Security hardening

- [ ] `JWT_SECRET` is at least 32 random chars (not the example value).
- [ ] `REFRESH_TOKEN_SECRET` is at least 32 random chars (not the example value).
- [ ] `CORS_ORIGIN` is set to your frontend URL (not `*`).
- [ ] `.env` is in `.gitignore` (it already is — verify it hasn't been committed).
- [ ] `EMAIL_PASS` is an app password, not your account password.
- [ ] Run `/code-review` to check for remaining issues.

## Phase 8 — Docs

Update for your project:

- `docs/api.md` — remove/replace User endpoints, add your domain endpoints.
- `docs/data-model.md` — replace User schema with your model.
- `docs/auth.md` — update if you changed the auth flow.
- `docs/env.md` — add any new env vars.
- `CLAUDE.md` — update "What this project is".
- Run `/codemap` to regenerate `docs/codemap.md`.

## Phase 9 — Docker

Update `docker-compose.yml`:

- Change the database name in `MONGO_URI` under the `api` service.
- Redis is already included — no changes needed unless you use an external Redis.
- Add any new env vars your fork needs.

## Phase 10 — Git

```bash
git init
git add .
git commit -m "chore: initial fork from template-backend-express"
git remote add origin <your-repo-url>
git push -u origin main
```

Claude Code hook infrastructure activates automatically:

- Feature branches enforced (`prepare-branch.sh` denies edits on `main`).
- Doc-sync enforced (`enforce-doc-sync.sh` blocks stop if docs fall behind).
- Auto-PR on stop (`open-pr.sh` pushes and opens PRs via `gh`).
