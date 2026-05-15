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

Drops a marker at `.claude/.session-markers/branch-prepared-<sid>` so it only runs once per session. For `Bash`, self-filters to file-modifying commands only.

### `inject-docs.sh` — PreToolUse on `Write|Edit|MultiEdit`

On first fire per session, reads every `.md`/`.txt` under `docs/` and injects them as `additionalContext` so Claude has project conventions loaded before its first edit. Marker: `.claude/.session-markers/docs-injected-<sid>`.

### `block-protected-branch.sh` — PreToolUse on `Write|Edit|MultiEdit`

Denies edits when on `main`/`master`/`develop`. Fallback in case `prepare-branch.sh` is bypassed.

### `block-protected-paths.sh` — PreToolUse on `Write|Edit|MultiEdit`

Denies edits to `.env*`, `secrets/`, `dist/`, `build/`, `node_modules/`, `.git/`, `coverage/`.

### `scan-secrets.sh` — PreToolUse on `Write|Edit|MultiEdit`

If `gitleaks` is installed, scans proposed file content for credentials. Denies on detection. Skips silently if `gitleaks` is not on PATH.

### `track-session-files.sh` — PostToolUse on `Write|Edit|MultiEdit`

Appends every modified file (relative path) to `.claude/.session-markers/files-<sid>.txt`. Used by `session-add.sh` so commits stage only this session's changes.

### `format-prettier.sh` — PostToolUse on `Write|Edit|MultiEdit`

Runs `prettier --write` on the just-written file for `.ts`, `.js`, `.json`, `.md`, `.yml`, `.yaml`, `.css`, `.html`, and `Dockerfile`. Skips silently if `npx` is unavailable.

### `update-docs.sh` — PostToolUse on `Write|Edit|MultiEdit`

After a source file edit, greps `docs/*.md` for the file's basename and stem. If any docs reference it, injects a reminder to review and update those docs in the same task.

### `enforce-doc-sync.sh` — Stop

Before allowing stop, checks that source changes tracked this session have corresponding doc updates. Mappings enforced:

| Source pattern                            | Required doc            |
| ----------------------------------------- | ----------------------- |
| `.claude/hooks/*.sh`                      | `docs/claude-hooks.md`  |
| `.claude/skills/*/SKILL.md`               | `docs/claude-skills.md` |
| `src/routes/*.ts` or `src/controllers/**` | `docs/api.md`           |
| `src/models/*.ts`                         | `docs/data-model.md`    |
| `src/config/env.ts` or `.env.example`     | `docs/env.md`           |

Blocks stop (up to 2 attempts per session) if a mapping is violated. After 2 attempts, gives up and logs a warning.

### `open-pr.sh` — Stop

After `enforce-doc-sync.sh` passes: if working tree is clean and branch has commits ahead of `origin/main`, pushes the branch and opens (or updates) a PR via `gh pr create`. Skips if `gh` is not installed, not authenticated, or no commits are ahead.

### `session-add.sh` — helper script (not wired as hook)

Stages only the files tracked for the current session (`files-<sid>.txt`). Use instead of `git add -A`:

```bash
bash .claude/hooks/session-add.sh
git commit -m "<message>"
```

---

_Update this file whenever a hook is added, removed, or its behavior changes. The `enforce-doc-sync.sh` Stop hook enforces this._
