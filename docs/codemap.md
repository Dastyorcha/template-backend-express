# Codemap

_Regenerate with `/codemap`._

## Entry point

- `index.ts` — Boot: loads env, mounts helmet/cors/rate-limit/routes, connects MongoDB, starts server.

## src/config/

- `src/config/env.ts` — Zod-validated env schema; exports typed `env` object; exits on missing required vars.
- `src/config/db.ts` — Connects Mongoose to `env.MONGO_URI`; throws on failure.

## src/models/

- `src/models/user.model.ts` — `IUser` interface + Mongoose schema (name, email, hashedPassword, loginedCount, isBlocked, timestamps).

## src/routes/

- `src/routes/user.routes.ts` — Mounts all `/api/users` routes; public block first, then private block with `authMiddleWare`.

## src/controllers/

- `src/controllers/user/auth.controller.ts` — Register (two-step email verification), verify-email, resend-code, login.
- `src/controllers/user/password.controller.ts` — Forgot-password (reset code flow), reset-password, change-password.
- `src/controllers/user/user.controller.ts` — Get all users, paginated users, update credentials, delete, block/unblock.

## src/middlewares/

- `src/middlewares/auth.middleware.ts` — Verifies `Authorization: Bearer <token>`; sets `res.locals.user.userId`.

## src/utils/

- `src/utils/response.ts` — `sendResponse({ res, statusCode, success, message, data?, error? })` — single source of truth for the response envelope.
- `src/utils/generatetoken.ts` — Signs a JWT `{ userId }` with 72h expiry using `env.JWT_SECRET`.
- `src/utils/send-email.ts` — Sends email via nodemailer using SMTP env vars.
- `src/utils/email-templates.ts` — HTML templates: `verificationCodeEmail(code)`, `passwordResetEmail(code)`.
- `src/utils/sanitize-id.ts` — Extracts, sanitizes, and validates a MongoDB ObjectId from `req.query.id`; returns null if invalid.

## src/types/

- `src/types/express.d.ts` — Augments Express `Response.locals` with `user: { userId: string }`.
