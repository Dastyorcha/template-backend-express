---
name: api-security-reviewer
description: Use this skill when running `/code-review`, or when making any change to `src/middlewares/`, `src/controllers/`, `src/routes/`, `src/utils/generatetoken.ts`, `src/config/env.ts`, `src/models/user.model.ts`, or `index.ts`. Also activates for tasks involving authentication, authorization, input validation, rate limiting, CORS, JWT, bcrypt, SMTP, or database queries. Read `docs/auth.md` and `docs/env.md` before applying the checklist.
---

# API Security Reviewer

Security checklist for every API change. Apply this alongside the `backend-architect` skill for code review, or as a gate before marking a task complete.

## Checklist

### Input validation

- [ ] All `req.body` fields used in a query or response are explicitly destructured and typed — never spread `req.body` directly.
- [ ] MongoDB ObjectIds are validated with `sanitizeId` (`src/utils/sanitize-id.ts`) before any query. A non-ObjectId string passed to `findById` throws a CastError — `sanitizeId` prevents this.
- [ ] User-controlled strings that end up in HTML (e.g., email body) are encoded or templated safely — no direct interpolation of raw request fields into HTML.
- [ ] Propose adding `zod` schema validation at the route boundary for any new endpoint that accepts a request body. Flag existing endpoints that lack it.

### Authentication & authorization

- [ ] Every private route has `authMiddleWare` as the second argument.
- [ ] `res.locals.user.userId` is used for ownership checks — never trust `userId` from `req.body` / `req.query`.
- [ ] JWT secret is read from `env.JWT_SECRET`. Reject the literal fallback `"secret-key-here"` — if found, flag it as a critical issue.
- [ ] JWT expiry is set explicitly (`expiresIn: "72h"` or shorter). Flag tokens with no expiry.

### Password / credential storage

- [ ] Passwords are stored **only** as bcrypt hashes (`hashedPassword` field). No plaintext `password` field anywhere in schemas, responses, or logs.
- [ ] bcrypt cost factor is ≥ 10.
- [ ] `hashedPassword` is excluded from any query that returns user data to the caller (`.select("-hashedPassword")`).

### Secrets & credentials

- [ ] No hardcoded credentials, API keys, SMTP passwords, or secrets in any source file. All secrets come from `env.ts` / `process.env`.
- [ ] `.env` is in `.gitignore`. `.env.example` contains only placeholder values.
- [ ] `console.log` never prints `req.body`, `req.headers.authorization`, passwords, codes, or tokens. Flag any such log.

### Rate limiting & abuse prevention

- [ ] Public auth endpoints (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/resend-code`) have the `authLimiter` applied in `index.ts`. Flag missing rate limits.
- [ ] Forgot-password returns the same 200 message regardless of whether the email exists (anti-enumeration). Confirm the response messages match.

### Transport & headers

- [ ] `helmet()` is the first app-level middleware in `index.ts`.
- [ ] CORS `origin` reads from `process.env.CORS_ORIGIN` — not hardcoded to `*` in production. Flag a wildcard origin.
- [ ] HTTPS is assumed for production; flag any HTTP-only cookie or redirect without a note.

### NoSQL injection

- [ ] `req.body`, `req.query`, and `req.params` are never passed as-is to Mongoose query operators (`$where`, `$gt`, `$regex`, etc.). Explicit field extraction prevents this; flag any pass-through.

### Error handling & information leakage

- [ ] 500 responses return `"Internal server error."` — not stack traces, error messages, or DB details.
- [ ] 401/403 messages do not reveal whether a user exists. Forgot-password already returns the same message for known/unknown emails — verify other endpoints follow the same pattern where appropriate.

## Severity scale

When reporting findings, classify each as:

| Severity     | Meaning                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **CRITICAL** | Exploitable now: credential exposure, auth bypass, plaintext secret storage, missing auth on private route                       |
| **HIGH**     | Likely exploitable: missing rate limit on auth endpoint, wildcard CORS in prod, JWT fallback secret, missing ObjectId validation |
| **MEDIUM**   | Defense-in-depth gap: missing `zod` validation, info leakage in error messages, log statement printing sensitive data            |
| **LOW**      | Best-practice improvement: missing `select("-hashedPassword")`, inconsistent message wording                                     |

## Reporting format

Produce a table:

| Severity | File:Line                    | Issue                                                                | Suggested fix                                                   |
| -------- | ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| CRITICAL | src/utils/generatetoken.ts:8 | Falls back to hardcoded `"secret-key-here"` when JWT_SECRET is unset | Remove fallback; `env.ts` will exit(1) if JWT_SECRET is missing |
| ...      |                              |                                                                      |                                                                 |

Follow the table with a section **"Passed checks"** listing checklist items that are correctly implemented, so the reviewer knows what was verified.
