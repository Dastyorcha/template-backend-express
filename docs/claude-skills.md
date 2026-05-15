# Claude Code skills

Skills are scoped instruction sets Claude loads on demand. Each skill lives in `.claude/skills/<name>/SKILL.md` with YAML frontmatter that tells Claude when to invoke it.

## Available skills

### `backend-architect`

**Path**: `.claude/skills/backend-architect/SKILL.md`

Triggers on any task touching `src/routes/`, `src/controllers/`, `src/models/`, `src/middlewares/`, `src/services/`, `src/repositories/`, `src/utils/`, `src/config/`, or `index.ts`.

Enforces (summary):

- **Layering**: `controllers` → `services` → `repositories` → `models`. No cross-layer inversions. Controllers never touch Mongoose or Redis.
- **Response envelope**: every HTTP response through `sendResponse`. Never `res.json()` directly.
- **Auth**: `authMiddleWare` sets `res.locals.user.userId` from a verified access token (`type === "access"`).
- **Env**: only via `src/config/env.ts`. ESLint `n/no-process-env` enforces this.
- **Mongoose**: `sanitizeId` before queries, `.select("-hashedPassword")` on user queries, no mass-assignment.
- **Controllers**: thin — parse → validate → call service → `sendResponse`. No business logic.
- **Style-change sync**: routes/controllers → `docs/api.md`; models → `docs/data-model.md`; auth → `docs/auth.md`; env → `docs/env.md`.

### `backend-testing`

**Path**: `.claude/skills/backend-testing/SKILL.md`

Triggers on `tests/**`, `/tdd`, `/test-gen`, tasks involving "test", "spec", "coverage", "TDD".

Enforces:

- **TDD cycle**: Red → Green → Refactor. Failing test must exist before implementation.
- **Test layers**: unit (mock all I/O) vs integration (real MongoDB Memory Server + ioredis-mock).
- **Mocking patterns**: `vi.mock("../../src/config/redis", async () => { const { default: RedisMock } = await import("ioredis-mock"); return { redis: new RedisMock() }; })`.
- **Coverage**: lines 80%, functions 80%, branches 70%. New code must not reduce coverage.
- **Structure**: `describe("functionName")` → `it("returns X when Y")`. Arrange → Act → Assert. One concept per test.

### `backend-caching`

**Path**: `.claude/skills/backend-caching/SKILL.md`

Triggers on `src/middlewares/cache*`, `src/config/redis*`, `src/services/code-store*`, `src/services/token*`, tasks involving "cache", "Redis", "TTL", "refresh token", "invalidat\*".

Enforces:

- **Key namespaces**: `verify:<email>` (180s), `reset:<email>` (600s), `refresh:<userId>:<token>` (env-configured), `cache:<url>` (endpoint TTL).
- **Code store**: always `codeStoreService`. Never in-memory Maps.
- **Refresh rotation**: old token revoked before new pair issued.
- **Cache invalidation**: `clearCachePattern("cache:/api/<resource>*")` after any mutation.
- **Testing**: mock redis with `ioredis-mock`. Never hit real Redis in tests.

### `api-security-reviewer`

**Path**: `.claude/skills/api-security-reviewer/SKILL.md`

Triggers on `/code-review` and edits to `src/middlewares/`, `src/controllers/`, `src/routes/`, `src/utils/generatetoken.ts`, `src/config/env.ts`, `src/models/user.model.ts`, `index.ts`.

Enforces: input validation, auth on private routes, no plaintext passwords, no hardcoded secrets, rate limiting, helmet, CORS from env, anti-enumeration on forgot-password, no stack traces in 500 responses. Reports findings in a CRITICAL/HIGH/MEDIUM/LOW severity table.

## Adding a new skill

1. Create `.claude/skills/<skill-name>/SKILL.md`.
2. Add YAML frontmatter: `name`, `description` (specific about file paths and task types).
3. Write concrete, enforceable rules — "use X" / "never Y" over abstract advice.
4. Update this file in the same change.

---

_Update this file whenever a skill is added, removed, or its trigger conditions change._
