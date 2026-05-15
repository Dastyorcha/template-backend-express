# API reference

Base path: `/api/users`

All responses follow the envelope: `{ success, message, data?, error? }`.

## Public endpoints

| Method | Path                         | Body / Query                   | Response                                   |
| ------ | ---------------------------- | ------------------------------ | ------------------------------------------ |
| POST   | `/register`                  | `{ name, email, password }`    | 200 — code sent to email                   |
| POST   | `/verify-email-for-register` | `{ email, code }`              | 201 `{ name, email, token, loginedCount }` |
| POST   | `/resend-code`               | `{ email }`                    | 200 — new code sent                        |
| POST   | `/login`                     | `{ email, password }`          | 200 `{ name, email, token, createdAt }`    |
| POST   | `/forgot-password`           | `{ email }`                    | 200 — always same message (no enumeration) |
| POST   | `/reset-password`            | `{ email, code, newPassword }` | 200                                        |

## Private endpoints (require `Authorization: Bearer <token>`)

| Method | Path                       | Body / Query                                    | Response                                         |
| ------ | -------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| GET    | `/get-all-users`           | —                                               | 200 `{ data: User[] }` (no `hashedPassword`)     |
| GET    | `/get-users-page`          | `?page=1&size=10`                               | 200 `{ data, elements, totalPages, page, size }` |
| PUT    | `/update-user-credentials` | `?id=<userId>` + `{ email, name }`              | 200 `{ data: User }`                             |
| DELETE | `/delete-user`             | `?id=<userId>`                                  | 200                                              |
| PUT    | `/toogle-block-user`       | `?id=<userId>&isBlocked=true\|false`            | 200                                              |
| PUT    | `/change-password`         | `?id=<userId>` + `{ oldPassword, newPassword }` | 200                                              |

## Common error codes

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| 400    | Missing fields, invalid code, expired code            |
| 401    | Missing or invalid JWT                                |
| 403    | Account is blocked                                    |
| 404    | Resource not found                                    |
| 409    | Conflict (duplicate email, already blocked/unblocked) |
| 500    | Internal server error                                 |

## Notes

- `id` query params are validated with `sanitizeId` (must be a valid MongoDB ObjectId).
- `hashedPassword` is never returned in any response.
- `forgot-password` and `reset-password` are rate-limited to 20 requests per 15-minute window.

---

_Update this file whenever a route is added, removed, or its request/response shape changes. The `enforce-doc-sync.sh` Stop hook will block the session if routes or controllers change without this file being updated._
