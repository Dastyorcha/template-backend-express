# Auth

## Token pair (access + refresh)

Authentication uses a short-lived access token and a long-lived refresh token stored in Redis.

| Token   | Type                         | Lifetime                              | Storage                          |
| ------- | ---------------------------- | ------------------------------------- | -------------------------------- |
| Access  | JWT signed with `JWT_SECRET` | `ACCESS_TOKEN_EXPIRY` (default `15m`) | Client only                      |
| Refresh | Opaque random hex (40 bytes) | `REFRESH_TOKEN_EXPIRY` (default `7d`) | Redis `refresh:<userId>:<token>` |

Access token payload: `{ userId, type: "access" }`.

## Auth middleware

`src/middlewares/auth.middleware.ts` runs on every private route:

1. Reads `Authorization: Bearer <token>`.
2. Verifies the JWT with `env.JWT_SECRET`.
3. Rejects tokens where `type !== "access"` (prevents refresh tokens being used as access tokens).
4. Sets `res.locals.user = { userId: string }` and calls `next()`, or responds 401.

`res.locals.user.userId` is typed via `src/types/express.d.ts`. Never read `userId` from `req.body`/`req.query` for ownership checks.

## Registration flow (two-step email verification)

```
POST /api/users/register  { name, email, password }
  → check email not already registered
  → generate 6-digit code
  → store { code, userDto } in Redis key verify:<email> (TTL: 3 min)
  → send verificationCodeEmail
  ← 200 "Verification code sent to your email."

POST /api/users/verify-email-for-register  { email, code }
  → get verify:<email> from Redis
  → check code match (400 if wrong)
  → hash password with bcrypt (cost 10)
  → create User document (loginedCount: 1)
  → delete Redis key
  → issue token pair
  ← 201 { name, email, accessToken, refreshToken }

POST /api/users/resend-code  { email }
  → must have a pending entry in Redis
  → generate new code, overwrite Redis key (new TTL: 3 min)
  → send verificationCodeEmail
  ← 200
```

## Login

```
POST /api/users/login  { email, password }
  → find user by email
  → check isBlocked
  → bcrypt.compare(password, hashedPassword)
  → increment loginedCount
  → issue token pair, store refresh token in Redis
  ← 200 { name, email, accessToken, refreshToken, createdAt }
```

## Token refresh

```
POST /api/users/refresh-token  { refreshToken }
  → look up refresh:<userId>:<token> in Redis
  → delete old token immediately (rotation — single use)
  → issue new token pair
  → store new refresh token in Redis
  ← 200 { accessToken, refreshToken }
  ← 401 if token not found
```

## Logout

```
POST /api/users/logout  { refreshToken }
  → look up and delete refresh token in Redis
  ← 200 (always — no enumeration)
```

## Forgot-password / reset flow

```
POST /api/users/forgot-password  { email }
  → (always 200 — no email enumeration)
  → generate 6-digit code
  → store { code, userId } in Redis reset:<email> (TTL: 10 min)
  → send passwordResetEmail
  ← 200 "If an account exists, a reset code has been sent."

POST /api/users/reset-password  { email, code, newPassword }
  → get reset:<email> from Redis
  → check code match (400 if wrong)
  → hash newPassword with bcrypt (cost 10)
  → update hashedPassword
  → delete Redis key
  ← 200 "Password reset successfully."
```

## Change password (authenticated)

```
PUT /api/users/change-password?id=<userId>  { oldPassword, newPassword }
  requires: Authorization: Bearer <accessToken>
  → sanitizeId(req) — 400 if invalid
  → find user by id (with password)
  → bcrypt.compare(oldPassword, hashedPassword)
  → hash newPassword, update user
  ← 200
```

## Force-logout on block/delete

`userService.toggleBlock(id, true)` and `userService.deleteUser(id)` both call `tokenService.revokeAllUserTokens(userId)`, which deletes all `refresh:<userId>:*` keys from Redis. Existing access tokens expire naturally within `ACCESS_TOKEN_EXPIRY`.
