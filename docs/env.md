# Environment variables

Validated at boot by `src/config/env.ts` using `zod`. The app exits with a clear error if a required variable is missing or invalid. Copy `.env.example` to `.env` to get started.

## Variables

| Variable               | Required | Default                                  | Description                                                                                                  |
| ---------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PORT`                 | no       | `5000`                                   | Port the HTTP server listens on.                                                                             |
| `MONGO_URI`            | **yes**  | —                                        | MongoDB connection string.                                                                                   |
| `JWT_SECRET`           | **yes**  | —                                        | Secret for signing access JWTs. Min 16 chars. Rotate when forking.                                           |
| `CORS_ORIGIN`          | no       | `http://localhost:3000`                  | Allowed CORS origin. Never `*` in production.                                                                |
| `REDIS_URL`            | no       | `redis://localhost:6379`                 | Redis connection string. Overridden by docker-compose.                                                       |
| `ACCESS_TOKEN_EXPIRY`  | no       | `15m`                                    | Access JWT lifetime. Format: `15m`, `1h`, `24h`.                                                             |
| `REFRESH_TOKEN_EXPIRY` | no       | `7d`                                     | Refresh token TTL in Redis. Format: `7d`, `30d`.                                                             |
| `REFRESH_TOKEN_SECRET` | no       | `change-me-in-production`                | Min 16 chars. Used for additional HMAC verification of opaque refresh tokens. **Must be set in production.** |
| `EMAIL_HOST`           | no       | `smtp.gmail.com`                         | SMTP host.                                                                                                   |
| `EMAIL_PORT`           | no       | `587`                                    | SMTP port. Use `465` for SSL.                                                                                |
| `EMAIL_USER`           | no       | ``                                       | SMTP username / email address.                                                                               |
| `EMAIL_PASS`           | no       | ``                                       | SMTP password or app password.                                                                               |
| `EMAIL_FROM`           | no       | `Template Backend <noreply@example.com>` | Sender name + address in outgoing emails.                                                                    |

## Notes

- `REDIS_URL` is overridden to `redis://redis:6379` by `docker-compose.yml` for the `api` service.
- `MONGO_URI` is overridden to `mongodb://mongo:27017/template-backend-express` by `docker-compose.yml`.
- `REFRESH_TOKEN_SECRET` defaults to a placeholder — **always set a real value in production**.
- For Gmail, generate an **App Password**: Google Account → Security → 2-Step Verification → App passwords.

## Adding a new variable

1. Add it to `envSchema` in `src/config/env.ts`.
2. Add it to `.env.example` with a placeholder value and inline comment.
3. Update this file.

---

_The `enforce-doc-sync.sh` Stop hook blocks the session if `src/config/env.ts` or `.env.example` change without this file being updated._
