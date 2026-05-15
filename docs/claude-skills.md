# Claude Code skills

Skills are scoped instruction sets Claude loads on demand. Each skill lives in `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) that tells Claude when to invoke it.

A skill activates when its `description` matches the current task — either via `/<skill-name>` or when Claude recognizes the task fits the trigger conditions.

## Available skills

### `backend-architect`

**Path**: `.claude/skills/backend-architect/SKILL.md`

Triggers on any task touching `src/routes/`, `src/controllers/`, `src/models/`, `src/middlewares/`, `src/services/`, `src/utils/`, `src/config/`, or `index.ts`. Also activates for auth flows, email, JWT, env config, database schema, request/response shaping, or error handling.

Enforces (summary — full rules in the skill file):

- **Layering**: `index.ts` → `routes` → `controllers` → `services` → `models` → `utils/config`. No cross-layer inversions.
- **Response envelope**: every HTTP response through `sendResponse`. Never `res.json()` directly.
- **Auth pattern**: JWT via `Authorization: Bearer`, `res.locals.user.userId` typed by `src/types/express.d.ts`.
- **Env access**: only via `src/config/env.ts` (zod-validated). ESLint `n/no-process-env` rule enforces this.
- **Mongoose**: typed `IEntity extends Document` interfaces, `timestamps: true`, `sanitizeId` before queries, `.select("-hashedPassword")` on user queries, no mass-assignment via `req.body`.
- **Naming**: files kebab-case, exports camelCase, types PascalCase, constants UPPER_SNAKE_CASE.
- **Error handling**: `async`/`try-catch` in all controllers, 500 fallback via `sendResponse`.
- **Two-step flow pattern**: in-memory Map for email verification / password reset; documented limitation (single-instance only).
- **Style-change sync rule**: routes/controllers → `docs/api.md`; models → `docs/data-model.md`; env → `docs/env.md`; arch changes → `docs/architecture.md`.

### `api-security-reviewer`

**Path**: `.claude/skills/api-security-reviewer/SKILL.md`

Triggers on `/code-review` and on edits to `src/middlewares/`, `src/controllers/`, `src/routes/`, `src/utils/generatetoken.ts`, `src/config/env.ts`, `src/models/user.model.ts`, or `index.ts`.

Enforces (summary — full checklist in the skill file):

- Input validation: explicit field destructuring, `sanitizeId` before queries, no `req.body` spread into queries.
- Auth/authz: `authMiddleWare` on every private route, `res.locals.user.userId` for ownership, no hardcoded JWT fallback secret.
- No plaintext password storage; bcrypt cost ≥ 10; `hashedPassword` excluded from responses.
- No hardcoded credentials anywhere; all secrets via `env.ts`.
- Rate limit on all public auth endpoints.
- `helmet()` first in `index.ts`; CORS origin from env.
- Anti-enumeration on forgot-password (same 200 regardless of email existence).
- No stack traces or DB details in 500 responses.

Findings are reported in a severity table: CRITICAL / HIGH / MEDIUM / LOW, with file:line and suggested fix.

## Adding a new skill

1. Create `.claude/skills/<skill-name>/SKILL.md`.
2. Add YAML frontmatter: `name`, `description` (be specific about file paths and task types).
3. Write concrete, enforceable rules — "use X" / "never Y" over abstract advice.
4. Update this file (`docs/claude-skills.md`) in the same change.

---

_Update this file whenever a skill is added, removed, or its trigger conditions change. The `enforce-doc-sync.sh` Stop hook enforces this._
