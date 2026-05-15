---
name: backend-architect
description: Use this skill on any task that touches the Express/MongoDB API layer — adding routes, controllers, models, services, repositories, middleware, or utilities. Triggers on file paths under `src/routes/`, `src/controllers/`, `src/models/`, `src/middlewares/`, `src/services/`, `src/repositories/`, `src/utils/`, `src/config/`, and `index.ts`.
---

# Backend Architect

## Layer diagram

```
index.ts → routes/ → controllers/ → services/ → repositories/ → models/ → MongoDB
                   ↓                           ↑
              middlewares/          config/redis + config/db
                                   utils/ + config/env
```

**Dependency direction:** each layer imports only from layers below it. Controllers never import repositories or models directly. Services never import controllers.

## Response envelope

Always `sendResponse` from `src/utils/response.ts`. Never `res.json()` directly.

```typescript
return sendResponse({ res, statusCode: 200, success: true, message: "...", data: result });
```

## Controller shape (thin)

```typescript
// parse → validate → call service → sendResponse
const result = await someService.doThing(id, body.field);
if ("notFound" in result) return sendResponse({ res, statusCode: 404, ... });
return sendResponse({ res, statusCode: 200, ..., data: result.data });
```

No business logic, no Mongoose, no Redis in controllers.

## Auth pattern

- `authMiddleWare` sets `res.locals.user = { userId }` from a verified access token (`type === "access"`)
- Controllers read `res.locals.user.userId` — never decode JWT themselves
- Never accept `userId` from `req.body`/`req.query` for ownership checks

## Env access

Only through `src/config/env.ts`. Never `process.env` in app code. New var: add to schema + `.env.example` + `docs/env.md`.

## Mongoose conventions

- `sanitizeId(req)` before any query using an ID from `req.query`
- `.select("-hashedPassword")` on all user queries returning data
- `findByIdWithPassword` only for password comparison
- Never spread `req.body` into model constructors or `$set`

## Route structure

- Public routes first, private routes after `authMiddleWare`
- Cache: `cacheMiddleware(ttl)` after `authMiddleWare` on idempotent GETs
- URL style: kebab-case

## Naming

- Files: kebab-case — `user.service.ts`, `auth.middleware.ts`
- Exports: camelCase singletons — `userRepository`, `authService`
- Types/interfaces: PascalCase — `IUser`, `CreateUserDto`

## Async/error handling

Every controller is `async`. `try/catch` everywhere. Catch → `sendResponse` 500. Services propagate errors.

## Style-change sync

Routes/controllers → `docs/api.md`; models → `docs/data-model.md`; auth/JWT → `docs/auth.md`; env → `docs/env.md` + `.env.example`; layer structure → `docs/architecture.md`. Update the doc in the same change.
