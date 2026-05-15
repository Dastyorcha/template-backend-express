# Refresh tokens

## Overview

Authentication uses two tokens:

- **Access token** — short-lived JWT (`ACCESS_TOKEN_EXPIRY`, default `15m`). Used in `Authorization: Bearer` header. Payload: `{ userId, type: "access" }`.
- **Refresh token** — long-lived opaque hex string (`REFRESH_TOKEN_EXPIRY`, default `7d`). Stored in Redis as `refresh:<userId>:<token>`. Single-use — rotated on every refresh.

## Token lifecycle

```
login / verify-register
  → generateTokenPair(userId)
  → storeRefreshToken(userId, refreshToken) in Redis (TTL = REFRESH_TOKEN_EXPIRY)
  ← { accessToken, refreshToken }

access token expires (after ACCESS_TOKEN_EXPIRY)
  → client sends POST /api/users/refresh-token  { refreshToken }
  → validate: look up refresh:<userId>:<token> in Redis
  → revoke: delete old key immediately
  → issue: new access + refresh token pair
  → store: new refresh token in Redis
  ← { accessToken, refreshToken }

logout
  → POST /api/users/logout  { refreshToken }
  → delete refresh token from Redis
  ← 200
```

## Token rotation

Every call to `/refresh-token` invalidates the old refresh token before issuing the new pair. Attempting to reuse an old token after rotation returns 401. This limits the window for token theft.

## Revocation

- `tokenService.revokeRefreshToken(userId, token)` — deletes one token.
- `tokenService.revokeAllUserTokens(userId)` — deletes all `refresh:<userId>:*` keys. Called when a user is blocked or deleted (force-logout).

Access tokens cannot be revoked before expiry — keep `ACCESS_TOKEN_EXPIRY` short (15m or less).

## Client implementation

1. Store `accessToken` in memory (not localStorage). Store `refreshToken` in an httpOnly cookie or secure storage.
2. On 401 from any private endpoint:
   a. Call `POST /refresh-token` with the stored `refreshToken`.
   b. On success: update stored tokens, retry the original request.
   c. On 401 from refresh: clear tokens, redirect to login.
3. On logout: call `POST /logout`, clear stored tokens.

## New endpoints

| Method | Path                       | Body               | Response                                   |
| ------ | -------------------------- | ------------------ | ------------------------------------------ |
| POST   | `/api/users/refresh-token` | `{ refreshToken }` | 200 `{ accessToken, refreshToken }` or 401 |
| POST   | `/api/users/logout`        | `{ refreshToken }` | 200                                        |
