# API reference

Base path: `/api/users`

All responses follow the envelope: `{ success, message, data?, error? }`.

## Public endpoints

| Method | Path                         | Body                           | Response                                                    |
| ------ | ---------------------------- | ------------------------------ | ----------------------------------------------------------- |
| POST   | `/register`                  | `{ name, email, password }`    | 200 — code sent                                             |
| POST   | `/verify-email-for-register` | `{ email, code }`              | 201 `{ name, email, accessToken, refreshToken }`            |
| POST   | `/resend-code`               | `{ email }`                    | 200 — new code sent                                         |
| POST   | `/login`                     | `{ email, password }`          | 200 `{ name, email, accessToken, refreshToken, createdAt }` |
| POST   | `/refresh-token`             | `{ refreshToken }`             | 200 `{ accessToken, refreshToken }`                         |
| POST   | `/logout`                    | `{ refreshToken }`             | 200                                                         |
| POST   | `/forgot-password`           | `{ email }`                    | 200 — always same message (no enumeration)                  |
| POST   | `/reset-password`            | `{ email, code, newPassword }` | 200                                                         |

## Private endpoints (require `Authorization: Bearer <accessToken>`)

| Method | Path                       | Body / Query                                    | Response                                                      |
| ------ | -------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/get-all-users`           | —                                               | 200 `{ data: User[] }` — cached 60s                           |
| GET    | `/get-users-page`          | `?page=1&size=10`                               | 200 `{ data, elements, totalPages, page, size }` — cached 30s |
| PUT    | `/update-user-credentials` | `?id=<userId>` + `{ email, name }`              | 200 `{ data: User }`                                          |
| DELETE | `/delete-user`             | `?id=<userId>`                                  | 200                                                           |
| PUT    | `/toogle-block-user`       | `?id=<userId>&isBlocked=true\|false`            | 200                                                           |
| PUT    | `/change-password`         | `?id=<userId>` + `{ oldPassword, newPassword }` | 200                                                           |

## Common error codes

| Status | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 400    | Missing fields, invalid code                                |
| 401    | Missing/invalid/expired access token; invalid refresh token |
| 403    | Account is blocked                                          |
| 404    | Resource not found                                          |
| 409    | Conflict (duplicate email, already blocked/unblocked)       |
| 500    | Internal server error                                       |

## Notes

- `id` query params validated with `sanitizeId` (must be a valid MongoDB ObjectId).
- `hashedPassword` never returned in any response.
- Auth endpoints rate-limited to 20 requests per 15-minute window (Redis-backed, survives restarts).
- Cached GET endpoints (`get-all-users`, `get-users-page`) are invalidated on any user mutation.
- Refresh tokens are single-use — each `/refresh-token` call invalidates the old token.

---

_Update this file whenever a route is added, removed, or its request/response shape changes._
