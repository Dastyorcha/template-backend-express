# Architecture

## What this project is

A fork-ready Express 5 + MongoDB + TypeScript REST API starter with Redis, service/repository layers, TDD tooling, and full Claude Code infrastructure. Ships a complete user auth flow (register with email verification, login, JWT access + refresh tokens, password reset) and user management endpoints.

## Layer diagram

```
index.ts
│  boot: env validation → middleware → routes → DB connect → Redis connect → listen
│
├── src/routes/          HTTP verb + path → controller function
├── src/controllers/     Parse request → validate → call service → sendResponse (thin)
├── src/services/        Business logic, multi-step operations, orchestration
├── src/repositories/    All Mongoose queries for a model (no business logic)
├── src/models/          Mongoose schemas + TypeScript interfaces
├── src/middlewares/     Cross-cutting request concerns (auth, cache)
├── src/utils/           Pure helpers: sendResponse, generateToken, sendEmail, sanitizeId
├── src/config/          env.ts (zod-validated), db.ts (mongoose), redis.ts (ioredis)
└── src/types/           Ambient TypeScript declarations (express.d.ts)
```

**Dependency direction**: each layer imports only from layers below it. Controllers → services → repositories → models. Never invert. Controllers never touch Mongoose or Redis directly.

## Request lifecycle

```
HTTP request
  → index.ts middleware (helmet, cors, json, rate-limit via Redis)
  → src/routes/<resource>.routes.ts
  → [authMiddleWare if private] → [cacheMiddleware(ttl) if GET]
  → src/controllers/<resource>/<action>.controller.ts
  → src/services/<domain>.service.ts
  → src/repositories/<resource>.repository.ts
  → src/models/<resource>.model.ts (Mongoose) + src/config/redis.ts (ioredis)
  → MongoDB / Redis
  → sendResponse({ res, statusCode, success, message, data? })
  → HTTP response { success, message, data?, error? }
```

## Response envelope

Every HTTP response goes through `src/utils/response.ts:sendResponse`. Shape:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "error": { ... } }
```

`data` and `error` are omitted when null/undefined. Never call `res.json()` directly.

## Auth

Access + refresh token pair. See `docs/auth.md` and `docs/refresh-tokens.md`.

- `Authorization: Bearer <accessToken>` header on private routes.
- `authMiddleWare` verifies JWT, checks `type === "access"`, sets `res.locals.user.userId`.
- Refresh tokens are opaque strings stored in Redis with TTL; single-use rotation on each refresh.

## Redis

Single `ioredis` instance at `src/config/redis.ts`. Used for:

1. Code store — verification/reset codes (TTL-native, replaces in-memory Maps)
2. Rate limiting — Redis-backed store survives restarts
3. Response cache — cache-aside on idempotent GETs
4. Refresh token store — with revocation support

See `docs/redis.md` for key namespaces and TTLs.

## Env

Zod-validated at boot by `src/config/env.ts`. Feature code imports `env`, never `process.env`. See `docs/env.md`.

## Naming

| Thing              | Convention          | Example                              |
| ------------------ | ------------------- | ------------------------------------ |
| Files              | kebab-case          | `user.model.ts`, `auth.service.ts`   |
| Functions / vars   | camelCase           | `generateToken`, `userRepository`    |
| Types / interfaces | PascalCase          | `IUser`, `CreateUserDto`             |
| Constants          | UPPER_SNAKE_CASE    | `MAX_PAGE_SIZE`                      |
| Mongoose models    | PascalCase singular | `User`                               |
| Route URLs         | kebab-case          | `/forgot-password`, `/refresh-token` |

## Adding a new resource

Use `/scaffold-resource <ResourceName>` — creates model, repository, service, controller, routes, mounts in `index.ts`, and updates docs automatically.
