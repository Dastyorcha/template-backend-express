# Environment variables

Validated at boot by `src/config/env.ts` using `zod`. The app exits with a clear error if a required variable is missing or invalid. Copy `.env.example` to `.env` to get started.

## Variables

| Variable      | Required | Default                                  | Description                                                                           |
| ------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `PORT`        | no       | `5000`                                   | Port the HTTP server listens on.                                                      |
| `MONGO_URI`   | **yes**  | —                                        | MongoDB connection string. E.g. `mongodb://localhost:27017/myapp`.                    |
| `JWT_SECRET`  | **yes**  | —                                        | Secret for signing JWTs. Min 16 characters. Rotate when forking.                      |
| `CORS_ORIGIN` | no       | `http://localhost:3000`                  | Allowed CORS origin. Set to your frontend URL in production. Never `*` in production. |
| `EMAIL_HOST`  | no       | `smtp.gmail.com`                         | SMTP host.                                                                            |
| `EMAIL_PORT`  | no       | `587`                                    | SMTP port. Use `465` for SSL.                                                         |
| `EMAIL_USER`  | no       | ``                                       | SMTP username / email address.                                                        |
| `EMAIL_PASS`  | no       | ``                                       | SMTP password or app password.                                                        |
| `EMAIL_FROM`  | no       | `Template Backend <noreply@example.com>` | Sender name + address shown in outgoing emails.                                       |

## Notes

- `EMAIL_USER` and `EMAIL_PASS` default to empty strings. Email sending will fail silently in dev if left empty — check `console.error` output.
- For Gmail, generate an **App Password** (not your account password): Google Account → Security → 2-Step Verification → App passwords.
- `MONGO_URI` is overridden by `docker-compose.yml` when running via Docker (`mongodb://mongo:27017/template-backend-express`).

## Adding a new variable

1. Add it to `envSchema` in `src/config/env.ts`.
2. Add it to `.env.example` with a placeholder value and inline comment.
3. Update this file.

---

_The `enforce-doc-sync.sh` Stop hook blocks the session if `src/config/env.ts` or `.env.example` change without this file being updated._
