#!/usr/bin/env bash
set -euo pipefail

# Pre-tool hook: before any commitable change, ensure Claude is working on a
# non-main feature branch that's up-to-date with origin/main. On the first
# fire per session: fetch origin, deny if on main (with a workflow prompt
# that lists branches), or pull origin/main into the current branch.
# Conflicts produce a deny that asks the user to resolve manually.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
SID=$(echo "$INPUT" | jq -r '.session_id // "default"')

# Bash: only act on file-modifying commands. Excludes git/npm/yarn/pnpm so
# Claude can switch branches, fetch, install deps without re-triggering prep.
if [[ "$TOOL" == "Bash" ]]; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  if ! echo "$CMD" | grep -qE '\b(mv|cp|rm|touch|mkdir|chmod|chown|ln)\b|\bsed\s+-i|>>?[^&0-9]'; then
    exit 0
  fi
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER_DIR="$PROJECT_DIR/.claude/.session-markers"
MARKER="$MARKER_DIR/branch-prepared-$SID"
mkdir -p "$MARKER_DIR"
echo "$SID" > "$MARKER_DIR/last-session"
[[ -f "$MARKER" ]] && exit 0

cd "$PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

git fetch origin --prune 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

COMMIT_REMINDER='BEFORE FINISHING THE TASK — commit your changes. The Stop hook will BLOCK your stop until the working tree is clean, then auto-push the branch and auto-open (or update) a PR against main. Stage ONLY this session'\''s files (never `git add -A`):
   bash .claude/hooks/session-add.sh
   git commit -m "<concise message describing the change>"
You do NOT need to run `git push` or `gh pr create` yourself — the Stop hook handles both. If a pre-commit hook fails, fix the issue and create a NEW commit (never `--amend`).'

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

inject() {
  jq -n --arg ctx "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: $ctx
    }
  }'
}

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" || "$BRANCH" == "develop" ]]; then
  LOCAL=$(git branch --format='%(refname:short)' | grep -vE '^(main|master|develop)$' || true)
  REMOTE=$(git branch -r --format='%(refname:short)' | sed 's|^origin/||' | grep -vE '^(main|master|develop|HEAD)$' | sort -u || true)
  ALL=$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -u | sed '/^$/d')
  [[ -z "$ALL" ]] && ALL="(no other branches)"

  REASON=$(printf 'You are on protected branch "%s". Before making any commitable change, follow this workflow:\n\n1. Pick a branch related to the user'\''s task from the list below, or create a new one.\n\nAvailable branches:\n%s\n\n2. Switch (existing) or create:\n   git checkout <branch>\n   # or, for a new branch:\n   git checkout -b feat/<kebab-desc>     # new feature\n   git checkout -b fix/<kebab-desc>      # bug fix\n   git checkout -b chore/<kebab-desc>    # refactor / cleanup / config\n\n3. Sync with main:\n   git pull origin main --no-rebase --no-edit\n   # If conflicts: STOP and ask the user to resolve them.\n\n4. Then retry the original tool call.\n\n%s' "$BRANCH" "$ALL" "$COMMIT_REMINDER")
  deny "$REASON"
fi

# Feature branch — try to pull origin/main if working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  touch "$MARKER"
  inject "Branch '$BRANCH' has uncommitted changes — skipped origin/main sync. $COMMIT_REMINDER"
  exit 0
fi

if PULL_OUT=$(git pull origin main --no-rebase --no-edit 2>&1); then
  touch "$MARKER"
  inject "Branch '$BRANCH' synced with origin/main. $COMMIT_REMINDER"
  exit 0
fi

CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
git merge --abort 2>/dev/null || true

REASON=$(printf 'Pulling origin/main into "%s" produced conflicts. The merge has been aborted.\n\nConflicted files:\n%s\n\nPlease ask the user to:\n1. Run: git pull origin main --no-rebase\n2. Resolve the conflicts\n3. Commit the merge\n\nThen retry the task.\n\nPull output:\n%s' "$BRANCH" "$CONFLICTS" "$PULL_OUT")
deny "$REASON"
