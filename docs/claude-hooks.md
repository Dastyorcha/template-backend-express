# Claude Code hooks

Hooks are shell scripts the Claude Code harness runs around tool calls. They live in `.claude/hooks/` and are wired in `.claude/settings.json`. Each hook reads a JSON event from stdin and either exits silently, prints `additionalContext` for Claude, or denies the action.

## Events

- **PreToolUse** — runs before a tool executes; can deny it.
- **PostToolUse** — runs after a tool succeeds; can inject follow-up context.
- **Stop** — runs when Claude finishes a response.

## Hooks

### `prepare-branch.sh` — PreToolUse on `Write|Edit|MultiEdit|Bash`

Before any commitable change, ensures Claude is on a non-protected feature branch that's up-to-date with `origin/main`. On first fire per session:

1. Fetches `origin --prune`.
2. If on `main`/`master`/`develop`: denies with a branch list and workflow prompt.
3. Otherwise: runs `git pull origin main --no-rebase --no-edit`. On conflict, aborts and denies.
4. On success: injects a reminder that committing before stopping is mandatory.

Drops a marker at `.claude/.session-markers/branch-prepared-<sid>` so it only runs once per session.

### `inject-docs.sh` — PreToolUse on `Write|Edit|MultiEdit`

On first fire per session, loads relevant docs based on the file being edited (lazy loading — not all docs):

| File path pattern                             | Docs loaded                                                   |
| --------------------------------------------- | ------------------------------------------------------------- |
| `src/routes/**`, `src/controllers/**`         | `api.md`, `architecture.md`                                   |
| `src/services/auth*`, `code-store*`, `token*` | `auth.md`, `architecture.md`, `redis.md`, `refresh-tokens.md` |
| `src/services/**`                             | `architecture.md`                                             |
| `src/repositories/**`                         | `data-model.md`, `architecture.md`                            |
| `src/models/**`                               | `data-model.md`                                               |
| `src/middlewares/cache*`, `src/config/redis*` | `caching.md`, `redis.md`                                      |
| `src/middlewares/auth*`                       | `auth.md`, `architecture.md`                                  |
| `src/config/env*`                             | `env.md`                                                      |
| `tests/**`                                    | `testing.md`                                                  |
| `.claude/hooks/**`                            | `claude-hooks.md`                                             |
| `.claude/skills/**`                           | `claude-skills.md`                                            |
| `index.ts`                                    | `architecture.md`, `env.md`                                   |
| (default)                                     | `architecture.md`                                             |

Marker: `.claude/.session-markers/docs-injected-<sid>`. Skips on subsequent fires.

### `block-protected-branch.sh` — PreToolUse on `Write|Edit|MultiEdit`

Denies edits when on `main`/`master`/`develop`. Fallback in case `prepare-branch.sh` is bypassed.

### `block-protected-paths.sh` — PreToolUse on `Write|Edit|MultiEdit`

Denies edits to `.env*`, `secrets/`, `dist/`, `build/`, `node_modules/`, `.git/`, `coverage/`.

### `scan-secrets.sh` — PreToolUse on `Write|Edit|MultiEdit`

If `gitleaks` is installed, scans proposed file content for credentials. Denies on detection.

### `track-session-files.sh` — PostToolUse on `Write|Edit|MultiEdit`

Appends every modified file (relative path) to `.claude/.session-markers/files-<sid>.txt`. Used by `session-add.sh`.

### `format-prettier.sh` — PostToolUse on `Write|Edit|MultiEdit`

Runs `prettier --write` on the just-written file for `.ts`, `.js`, `.json`, `.md`, `.yml`, `.yaml`, `.css`, `.html`, and `Dockerfile`.

### `update-docs.sh` — PostToolUse on `Write|Edit|MultiEdit`

After a source file edit, greps `docs/*.md` for the file's basename and stem. If any docs reference it, injects a reminder to review and update those docs.

### `enforce-doc-sync.sh` — Stop

Before allowing stop, checks that source changes tracked this session have corresponding doc updates. Mappings enforced:

| Source pattern                                                            | Required doc             |
| ------------------------------------------------------------------------- | ------------------------ |
| `.claude/hooks/*.sh`                                                      | `docs/claude-hooks.md`   |
| `.claude/skills/*/SKILL.md`                                               | `docs/claude-skills.md`  |
| `src/routes/*.ts` or `src/controllers/**`                                 | `docs/api.md`            |
| `src/models/*.ts`                                                         | `docs/data-model.md`     |
| `src/config/env.ts` or `.env.example`                                     | `docs/env.md`            |
| `src/services/code-store*`, `src/config/redis*`, `src/middlewares/cache*` | `docs/redis.md`          |
| `src/middlewares/cache*`                                                  | `docs/caching.md`        |
| `src/services/token*`                                                     | `docs/refresh-tokens.md` |
| `tests/**/*.test.ts`                                                      | `docs/testing.md`        |

Blocks stop (up to 2 attempts per session). After 2 attempts, gives up and logs a warning.

### `open-pr.sh` — Stop

If working tree is clean and branch has commits ahead of `origin/main`, pushes and opens (or updates) a PR via `gh pr create`.

### `session-add.sh` — helper (not wired as hook)

Stages only files tracked for the current session. Use instead of `git add -A`:

```bash
bash .claude/hooks/session-add.sh
git commit -m "<message>"
```

---

_Update this file whenever a hook is added, removed, or its behavior changes._
