# Fork checklist

Step-by-step guide for turning this template into your own project. Complete each phase before moving to the next.

## Phase 0 — Pre-flight decisions

Decide these up front:

- **Project name** (e.g. `my-api`)
- **MongoDB database name** (e.g. `my-api-prod`)
- **Primary domain / API base URL** (e.g. `https://api.myproject.com`)
- **SMTP provider** (Gmail app password, SendGrid, Resend, etc.)
- **Auth token lifetime** — keep 72h or change in `src/utils/generatetoken.ts`

## Phase 1 — Package identity

**`package.json`** — update `name`, `version`, `description`, `author`.

## Phase 2 — Environment

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` to your database (local or Atlas).
3. Generate a strong `JWT_SECRET` (min 32 chars): `openssl rand -hex 32`.
4. Set `CORS_ORIGIN` to your frontend URL.
5. Configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` for your SMTP provider.
6. Set `PORT` if you need something other than 5000.

## Phase 3 — Domain model

The template ships with a `User` model. You have two options:

**Option A — Extend User**: add fields to `src/models/user.model.ts` for your domain (e.g., `role`, `avatar`, `organization`). Update `docs/data-model.md`.

**Option B — Replace**: if your primary entity is not a user:

1. Rename or delete `src/models/user.model.ts`.
2. Create your own model with `/scaffold-resource <YourEntity>`.
3. Update or delete `src/controllers/user/` and `src/routes/user.routes.ts`.
4. Update the route mount in `index.ts`.
5. Update `docs/api.md` and `docs/data-model.md`.

## Phase 4 — Email templates

`src/utils/email-templates.ts` has generic English copy. Update:

- `verificationCodeEmail(code)` — brand name, colors, sender name.
- `passwordResetEmail(code)` — same.

Replace the inline CSS color `#268ACA` with your brand color.

## Phase 5 — Auth decisions

Decide whether to keep the two-step email verification flow on register:

- **Keep it**: it's production-ready as-is (with the in-memory Map limitation noted in `docs/auth.md`).
- **Skip it**: change `POST /register` to create the user directly without email verification. Remove `verificationCodes` Map and the `/verify-email-for-register` + `/resend-code` routes.

If you expect > 1 server instance or need restarts to not break in-flight registrations: replace the `verificationCodes` and `passwordResetCodes` Maps with Redis or a MongoDB TTL collection.

## Phase 6 — Security hardening

- [ ] `JWT_SECRET` is set and is at least 32 random characters (not the example value).
- [ ] `CORS_ORIGIN` is set to your actual frontend URL (not `*`).
- [ ] `.env` is in `.gitignore` (it already is — verify it hasn't been committed).
- [ ] `EMAIL_PASS` is an app password or API key, not your account password.
- [ ] Run `/code-review` to check for any remaining issues.

## Phase 7 — Docs

Update these docs for your project:

- `docs/api.md` — remove/replace User endpoints, add your domain endpoints.
- `docs/data-model.md` — replace the User schema with your model.
- `docs/auth.md` — update if you changed the auth flow.
- `docs/env.md` — add any new env vars you introduced.
- `CLAUDE.md` — update "What this project is" to describe your fork.
- Run `/codemap` to regenerate `docs/codemap.md`.

## Phase 8 — Docker (optional)

Update `docker-compose.yml`:

- Change the database name in the `MONGO_URI` environment variable under the `api` service.
- Add any new env vars your fork needs.

## Phase 9 — Git

```bash
git init
git add .
git commit -m "chore: initial fork from template-backend-express"
git remote add origin <your-repo-url>
git push -u origin main
```

From here, Claude Code's hook infrastructure is active:

- Feature branches enforced (`prepare-branch.sh` denies edits on `main`).
- Doc-sync enforced (`enforce-doc-sync.sh` blocks stop if docs fall behind).
- Auto-PR on stop (`open-pr.sh` pushes and opens PRs via `gh`).
