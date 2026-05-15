# Architecture

## What this project is

A fork-ready Express 5 + MongoDB + TypeScript REST API starter. It ships a complete user auth flow (register with email verification, login, password reset) and a set of user management endpoints. When forking, swap the `User` model for your domain entity and extend from there.

## Layer diagram

```
index.ts
│  boot: env validation → middleware → routes → DB connect → listen
│
├── src/routes/          HTTP verb + path → controller function
├── src/controllers/     Parse request → validate → call service/model → sendResponse
├── src/services/        (add as needed) Business logic, multi-step operations
├── src/models/          Mongoose schemas + TypeScript interfaces
├── src/middlewares/     Cross-cutting request concerns (auth, etc.)
├── src/utils/           Pure helpers (sendResponse, generateToken, sendEmail, sanitizeId, email-templates)
├── src/config/          env.ts (zod-validated env), db.ts (mongoose connect)
└── src/types/           Ambient TypeScript declarations (express.d.ts)
```

**Dependency direction**: each layer only imports from layers below it. `routes` → `controllers` → `services/models` → `utils/config`. Never invert.

## Request lifecycle

```
HTTP request
  → index.ts middleware (helmet, cors, json, rate-limit)
  → src/routes/<resource>.routes.ts
  → [authMiddleWare if private]
  → src/controllers/<resource>/<action>.controller.ts
  → [src/services/ if complex logic]
  → src/models/<resource>.model.ts (Mongoose)
  → MongoDB
  → sendResponse({ res, statusCode, success, message, data? })
  → HTTP response { success, message, data?, error? }
```

## Response envelope

Every HTTP response goes through `src/utils/response.ts:sendResponse`. The JSON shape is always:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "error": { ... } }
```

`data` and `error` are omitted when null/undefined. Never call `res.json()` directly.

## Auth

JWT-based. See `docs/auth.md` for the full flow. Key points:

- `Authorization: Bearer <token>` header on private routes.
- `src/middlewares/auth.middleware.ts` verifies the token and sets `res.locals.user.userId`.
- `src/types/express.d.ts` types `res.locals.user` — use it, never cast to `any`.

## Env

All env vars are validated at boot by `src/config/env.ts` (zod). Feature code imports from `env`, never from `process.env` directly. See `docs/env.md` for the full list.

## Naming

| Thing                        | Convention          | Example                               |
| ---------------------------- | ------------------- | ------------------------------------- |
| Files                        | kebab-case          | `user.model.ts`, `send-email.ts`      |
| Functions / vars             | camelCase           | `generateToken`, `sendResponse`       |
| Types / interfaces / classes | PascalCase          | `IUser`, `SendEmailOptions`           |
| Constants                    | UPPER_SNAKE_CASE    | `MAX_PAGE_SIZE`                       |
| Mongoose models              | PascalCase singular | `User`, `Post`                        |
| Route URLs                   | kebab-case          | `/forgot-password`, `/get-users-page` |

## Adding a new resource

Use `/scaffold-resource <ResourceName>` — it creates the model, controller, routes, mounts in `index.ts`, and updates `docs/api.md`, `docs/data-model.md`, and `docs/codemap.md` automatically.

To do it manually: follow the `User` resource as the reference pattern. One model file, one controller directory, one routes file, mount in `index.ts`.
