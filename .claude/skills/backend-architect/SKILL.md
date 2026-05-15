---
name: backend-architect
description: Use this skill on any task that touches the Express/MongoDB API layer — adding routes, controllers, models, services, middleware, or utilities. Triggers on file paths under `src/routes/`, `src/controllers/`, `src/models/`, `src/middlewares/`, `src/services/`, `src/utils/`, `src/config/`, and `index.ts`. Also activates for tasks involving authentication flows, email, JWT, env config, database schema design, request/response shaping, or error handling. Read `CLAUDE.md`, `docs/architecture.md`, `docs/api.md`, `docs/data-model.md`, `docs/auth.md`, and `docs/env.md` before applying these rules.
---

# Backend Architect

Strict ruleset for every API change in this Express 5 + MongoDB + TypeScript starter template. Every rule is enforceable. Where a rule references a file, the linked doc is the source of truth.

This skill and `CLAUDE.md` must agree. If they ever disagree, `docs/` is the tiebreaker — fix whichever is wrong in the same change.

## Decide autonomously vs. ASK the user

### Decide autonomously

- Choosing HTTP status codes for new error cases.
- Whether to use 200 vs 201 on a create endpoint.
- Adding `select("-hashedPassword")` to queries returning user objects.
- Ordering of middleware on a route.
- bcrypt cost factor (always 10 unless user specifies).
- Whether to introduce an in-memory Map vs skipping state for a short-lived flow.
- Adding `{ timestamps: true }` to a new Mongoose schema.

### ASK before

- Installing a new package.
- Changing a public route's URL, method, or required auth status.
- Switching the in-memory Map pattern to Redis or another external store.
- Adding a new required env var (impacts all forks — update `docs/env.md` and `.env.example` in the same change).
- Changing the response envelope shape (`{ success, message, data?, error? }`).
- Removing or renaming an exported function that other controllers or routes use.

## Layer rules (per `docs/architecture.md`)

```
index.ts             ← boot: env validation, middleware, route mounting, DB connect
src/routes/          ← Express Router; maps HTTP verbs+paths to controller functions
src/controllers/     ← Request parsing, validation, response; delegates logic to services
src/services/        ← Business logic; owns complex queries, multi-step operations (add as needed)
src/models/          ← Mongoose schemas + typed interfaces
src/middlewares/     ← Cross-cutting request concerns (auth, rate-limit wrappers, etc.)
src/utils/           ← Pure helpers: sendResponse, generateToken, sendEmail, sanitizeId, email-templates
src/config/          ← env.ts (zod validation), db.ts (mongoose connect)
src/types/           ← TypeScript ambient declarations (express.d.ts)
```

**Direction rule**: each layer may only import from layers below it. No controller imports another controller. No model imports a controller. `utils/` has no imports from `routes/`, `controllers/`, `services/`, or `models/`.

## Response envelope — always use `sendResponse`

Every HTTP response **must** go through `src/utils/response.ts:sendResponse({ res, statusCode, success, message, data?, error? })`. Never call `res.json()` or `res.status().json()` directly in controllers or middleware.

The envelope shape is:

```json
{ "success": true|false, "message": "...", "data": ..., "error": ... }
```

`data` and `error` are omitted from the body when `null`/`undefined`.

When `res` is `null` (e.g., boot-time error paths), `sendResponse` is a no-op — that's intentional. Log the error instead.

## Auth pattern (per `docs/auth.md`)

- Tokens are signed by `src/utils/generatetoken.ts` with `{ userId: id }`, 72h expiry, secret from `env.JWT_SECRET`.
- `src/middlewares/auth.middleware.ts` verifies the `Authorization: Bearer <token>` header and stores `{ userId }` on `res.locals.user`.
- The `Response` type augmentation in `src/types/express.d.ts` types `res.locals.user.userId` — use it; never cast `res.locals` to `any`.
- Private routes: add `authMiddleWare` as the second argument before the controller in `src/routes/user.routes.ts`. Keep public / private blocks separated by a comment.
- Never accept `userId` from `req.body` or `req.query` for ownership checks — always read it from `res.locals.user`.

## Env access — only through `src/config/env.ts`

All `process.env` access is centralized in `src/config/env.ts` (zod-validated at boot). Feature code reads from the exported `env` object. The ESLint rule `n/no-process-env` enforces this (with a file-level exemption only for `env.ts` and `send-email.ts`).

When adding a new env var:

1. Add it to the `envSchema` in `src/config/env.ts`.
2. Add it to `.env.example` with a placeholder value and inline comment.
3. Update `docs/env.md`.

## Mongoose conventions (per `docs/data-model.md`)

- One schema + model per file in `src/models/`, named `<Entity>.model.ts`.
- Always include `{ timestamps: true }` in the schema options.
- Export a typed interface `I<Entity> extends Document` alongside the model.
- Never store plaintext secrets, tokens, or passwords. Hash passwords with bcrypt (cost 10).
- Before any `findById` / `updateOne` / `deleteOne` query, validate the ID with `sanitizeId` from `src/utils/sanitize-id.ts`. Returns `null` on invalid input — send a 400 immediately.
- Never spread `req.body` into `new Model(req.body)` or `updateOne($set: req.body)` — pick fields explicitly to prevent mass assignment.
- Add `unique: true` to fields that must be unique (e.g., `email`). Add `lowercase: true, trim: true` to string fields where appropriate.
- Exclude `hashedPassword` from queries that return user objects: `.select("-hashedPassword")`.

## Routes (per `docs/api.md`)

- URLs are kebab-case.
- HTTP verbs: POST for mutations, GET for reads (idempotent), PUT/PATCH for updates, DELETE for deletes.
- Route files live at `src/routes/<resource>.routes.ts` and are mounted in `index.ts` as `/api/<resource>`.
- Public / private split: public block first, then `// Private routes (require valid JWT)` comment, then private routes with `authMiddleWare` as the second argument.
- When adding or changing a route, update `docs/api.md` in the same change (the `enforce-doc-sync.sh` Stop hook enforces this).

## Naming

- Files: kebab-case (`user.model.ts`, `send-email.ts`, `sanitize-id.ts`).
- Exported functions/vars: camelCase.
- Types, interfaces, classes: PascalCase.
- Constants: UPPER_SNAKE_CASE.
- Mongoose models: PascalCase singular (`User`, `Post`).

## Async / error handling

- All controller functions are `async` and wrapped in `try/catch`.
- The catch block always calls `sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error })`.
- Never `throw` inside a controller — catch and respond.
- Never leave a floating promise in a controller or middleware (`@typescript-eslint/no-floating-promises` is set to `error`).

## Two-step flow pattern (email verification, password reset)

When adding a flow that requires sending a code and then verifying it:

1. **Request step** (`POST /request-action`): look up the entity, generate a 6-digit code (`Math.floor(100000 + Math.random() * 900000).toString()`), store `{ code, expiresAt, ...context }` in a module-level `Map` keyed by email, send email via `sendEmail` from `src/utils/send-email.ts` + an HTML template from `src/utils/email-templates.ts`.
2. **Verify step** (`POST /confirm-action`): retrieve from the Map, check expiry (delete + 400 if expired), check code match (400 if wrong), execute the side effect, delete the Map entry, respond 200/201.

**Limitation**: the Map is in-process and single-instance. Restarting the server clears all pending flows. For multi-instance deployments, replace the Map with Redis or a database-backed token table (add a note to `docs/auth.md` when you do).

## Style-change sync rule (mandatory)

Any change that affects a documented API surface **must** update the corresponding doc(s) in the same change:

1. `docs/api.md` — when routes or request/response shapes change.
2. `docs/data-model.md` — when Mongoose schemas change.
3. `docs/auth.md` — when the auth flow, JWT shape, middleware contract, or verification flow changes.
4. `docs/env.md` + `.env.example` — when env vars are added, renamed, or removed.
5. `docs/architecture.md` — when the layer structure, dependency direction, or naming conventions change.
6. `CLAUDE.md` — when project-level guidance shifts.
7. **This file** — when any of the rules above change.

If a change does not affect any of the above, state that explicitly when reporting it.

## Reference patterns

| Pattern                    | File                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Response envelope          | `src/utils/response.ts`                                                                                     |
| JWT generation             | `src/utils/generatetoken.ts`                                                                                |
| Auth middleware            | `src/middlewares/auth.middleware.ts`                                                                        |
| ID sanitization            | `src/utils/sanitize-id.ts`                                                                                  |
| Email sending              | `src/utils/send-email.ts`                                                                                   |
| Email templates            | `src/utils/email-templates.ts`                                                                              |
| Env access                 | `src/config/env.ts`                                                                                         |
| Two-step code flow         | `src/controllers/user/auth.controller.ts` (register), `src/controllers/user/password.controller.ts` (reset) |
| Model with typed interface | `src/models/user.model.ts`                                                                                  |
| Route structure            | `src/routes/user.routes.ts`                                                                                 |
