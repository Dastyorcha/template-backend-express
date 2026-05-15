# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project guide for Claude Code. **Always loaded.** Detail lives in `docs/` and `.claude/skills/`.

## What this project is

A fork-ready Express 5 + MongoDB + **Redis** + TypeScript REST API starter with service/repository layers and TDD tooling. Ships a complete user auth flow (two-step email verification, login, access + refresh JWT tokens, password reset) and user management. Fork it, swap the `User` model for your domain entity, and extend. See `docs/fork-checklist.md` to adapt it for a new project.

## Commands

```bash
npm run dev              # tsx watch — hot-reload dev server
npm run build            # tsc → dist/
npm run start            # node dist/index.js
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .
npm run lint:fix         # eslint . --fix
npm run test             # vitest run (unit + integration)
npm run test:watch       # vitest watch
npm run test:coverage    # vitest run with coverage thresholds
docker compose up        # boots MongoDB + Redis + API together
```

## Workflow & Git (MUST follow on every task)

This repo runs session-aware hooks that track every file you modify, enforce branch protection, and auto-open a PR on stop. **Committing before you finish is mandatory** — the Stop hook blocks stop until the working tree is clean.

1. **Never work on `main` / `master` / `develop`.** The `prepare-branch.sh` PreToolUse hook denies edits on protected branches. Switch first:
   ```bash
   git checkout -b feat/<kebab-desc>   # new feature
   git checkout -b fix/<kebab-desc>    # bug fix
   git checkout -b chore/<kebab-desc>  # refactor / config / cleanup
   ```
2. **Make your edits.** Each Write/Edit is recorded to `.claude/.session-markers/files-$SID.txt`.
3. **Update relevant docs in the same change.** Routes/controllers → `docs/api.md`; models → `docs/data-model.md`; env → `docs/env.md`. The `enforce-doc-sync.sh` Stop hook blocks stop if these fall out of sync.
4. **Commit before stopping:**
   ```bash
   bash .claude/hooks/session-add.sh
   git commit -m "<concise message>"
   ```
5. **Stop normally.** `open-pr.sh` pushes the branch and opens (or updates) a PR against `main`. Do **not** run `git push` or `gh pr create` yourself.

## Tech stack

- **Express 5** with TypeScript strict mode
- **MongoDB** via Mongoose 8; connection in `src/config/db.ts`
- **Redis** via ioredis; client in `src/config/redis.ts` — code store, rate limiting, response cache, refresh tokens
- **JWT** (`jsonwebtoken`) — access token (15m) + refresh token (7d) pair; secrets from `env.JWT_SECRET` / `env.REFRESH_TOKEN_SECRET`
- **bcrypt** — password hashing, cost 10
- **nodemailer** — SMTP email via `src/utils/send-email.ts`
- **zod** — env validation at boot (`src/config/env.ts`)
- **helmet + cors + express-rate-limit** (Redis-backed) — security middleware in `index.ts`
- **Vitest** — unit + integration tests; coverage thresholds enforced on pre-push
- **ESLint + Prettier + Husky** — lint/format on save and pre-commit

## Architecture (see `docs/architecture.md`)

```
index.ts → routes/ → controllers/ → services/ → repositories/ → models/ → MongoDB
                   ↓                           ↑
              middlewares/          config/redis + config/db
                                   utils/ + config/env
```

Every HTTP response goes through `src/utils/response.ts:sendResponse({ res, statusCode, success, message, data?, error? })`. Never call `res.json()` directly.

## Key conventions

| Convention        | Rule                                                                        | Doc                        |
| ----------------- | --------------------------------------------------------------------------- | -------------------------- |
| Response envelope | Always `sendResponse`                                                       | `docs/architecture.md`     |
| Auth              | `res.locals.user.userId` from `authMiddleWare` (access token only)          | `docs/auth.md`             |
| Env access        | Only via `src/config/env.ts`                                                | `docs/env.md`              |
| ID params         | Always `sanitizeId(req)` before queries                                     | `src/utils/sanitize-id.ts` |
| Code store        | Always `codeStoreService` (Redis TTL) — never in-memory Maps                | `docs/redis.md`            |
| Cache             | `cacheMiddleware(ttl)` on idempotent GETs; `clearCachePattern` on mutations | `docs/caching.md`          |
| Tokens            | `tokenService.generateTokenPair` — access (JWT) + refresh (opaque, Redis)   | `docs/refresh-tokens.md`   |

## Skills

| Skill                   | Activates on                                               | Doc                     |
| ----------------------- | ---------------------------------------------------------- | ----------------------- |
| `backend-architect`     | Any `src/` edit, route/model/controller/service/repo tasks | `docs/claude-skills.md` |
| `backend-testing`       | `tests/**`, `/tdd`, `/test-gen`, TDD tasks                 | `docs/claude-skills.md` |
| `backend-caching`       | Redis/cache/token/TTL tasks                                | `docs/claude-skills.md` |
| `api-security-reviewer` | `/code-review`, auth/middleware/route edits                | `docs/claude-skills.md` |
| `doc-writer`            | Manual `/doc-writer <topic>` — documents a topic across all related docs and keeps the Doc map below current | `docs/claude-skills.md` |

## Slash commands

| Command                     | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `/tdd <feature>`            | Enforce Red → Green → Refactor cycle                        |
| `/test-gen <file>`          | Generate complete test suite for a file                     |
| `/code-review`              | Security + architecture review of changed files             |
| `/refactor`                 | Guided refactor with phased diffs                           |
| `/scaffold-resource <Name>` | Generate model + repository + service + controller + routes |
| `/codemap`                  | Regenerate `docs/codemap.md`                                |
| `/doc-writer <topic>`       | Document `<topic>` across all related `docs/*.md` (uses Doc map) |

## Doc map

The single index of every `docs/*.md` file, what it covers, and what source-side changes should sync into it. `/doc-writer` reads this table to pick affected docs; when a new doc is created or its scope shifts, this table is updated in the same change. **Do not crawl `docs/` to "explore" — this table is the entry point.**

| Doc                          | Covers                                                  | Sync triggers                                            |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| `docs/architecture.md`       | Layering, file map, naming, response envelope           | Layer/structure changes, new directories under `src/`    |
| `docs/api.md`                | HTTP routes, request/response shapes, status codes      | `src/routes/`, `src/controllers/`                        |
| `docs/auth.md`               | Auth flow, JWT, OTP, password reset, middleware         | `src/middlewares/auth*`, `src/services/token*`, auth controllers |
| `docs/data-model.md`         | Mongoose schemas, indexes, hooks                        | `src/models/`                                            |
| `docs/env.md`                | Env vars (schema + meaning)                             | `src/config/env.ts`, `.env.example`                      |
| `docs/redis.md`              | Redis keys, namespaces, TTLs                            | `src/config/redis*`, `src/services/code-store*`          |
| `docs/caching.md`            | Cache middleware, invalidation patterns                 | `src/middlewares/cache*`, mutation handlers              |
| `docs/refresh-tokens.md`     | Refresh token rotation, revocation                      | `src/services/token*`, refresh controller                |
| `docs/testing.md`            | Test conventions, mocking, coverage thresholds          | `tests/**`, `vitest.config*`                             |
| `docs/fork-checklist.md`     | Repo fork/bootstrap steps                               | Project-bootstrap changes                                |
| `docs/claude-hooks.md`       | Every shell hook in `.claude/hooks/`                    | `.claude/hooks/`                                         |
| `docs/claude-skills.md`      | Every skill in `.claude/skills/`                        | `.claude/skills/`                                        |
| `docs/codemap.md`            | File inventory                                          | Regenerated by `/codemap`                                |

## Style-change sync rule

Any change that affects a documented surface **must** update the doc in the same change:

1. Routes or request/response shapes → `docs/api.md`
2. Mongoose schema → `docs/data-model.md`
3. Auth flow / JWT / middleware → `docs/auth.md`
4. Env vars → `docs/env.md` + `.env.example`
5. Layer structure or naming → `docs/architecture.md`
6. Redis keys, TTLs, cache patterns → `docs/redis.md` and/or `docs/caching.md`
7. Refresh token flow → `docs/refresh-tokens.md`
8. Test conventions or coverage rules → `docs/testing.md`
9. Hooks → `docs/claude-hooks.md`
10. Skills → `docs/claude-skills.md`
11. Project-level guidance → this file (`CLAUDE.md`)
