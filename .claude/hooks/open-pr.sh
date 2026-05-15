#!/usr/bin/env bash
set -euo pipefail

# Stop hook: when Claude finishes a response, ensure session work is committed,
# push the feature branch, and auto-open a PR against main. Subsequent runs
# update the existing PR.
#
# Behavior:
#   - Protected branches: skip silently (nothing to do)
#   - Uncommitted changes: BLOCK stop and instruct Claude to commit
#       (capped at MAX_ATTEMPTS to avoid infinite loops on stuck commits)
#   - Tree clean + commits ahead: push, open PR if missing, update if present
#   - Tree clean + no commits ahead: log and exit

INPUT=$(cat)
SID=$(echo "$INPUT" | jq -r '.session_id // "default"')

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
[[ -z "$BRANCH" || "$BRANCH" == "main" || "$BRANCH" == "master" || "$BRANCH" == "develop" || "$BRANCH" == "HEAD" ]] && exit 0

MARKER_DIR="$PROJECT_DIR/.claude/.session-markers"
mkdir -p "$MARKER_DIR"
ATTEMPT_FILE="$MARKER_DIR/stop-attempts-$SID"
MAX_ATTEMPTS=2

# 1. If working tree is dirty, block stop and ask Claude to commit.
if [[ -n "$(git status --porcelain)" ]]; then
  ATTEMPTS=$(cat "$ATTEMPT_FILE" 2>/dev/null || echo 0)
  if [[ "$ATTEMPTS" -lt "$MAX_ATTEMPTS" ]]; then
    echo "$((ATTEMPTS + 1))" > "$ATTEMPT_FILE"
    REASON=$(cat <<'EOF'
You have uncommitted changes in this session. Commit them before stopping so the auto-PR flow can open or update a PR. Run:

  bash .claude/hooks/session-add.sh
  git commit -m "<concise message describing the change>"

Then finish your response. The Stop hook will push the branch and open (or update) the PR automatically — you do NOT need to run `git push` or `gh pr create` yourself.

If a pre-commit hook fails, fix the underlying issue and create a NEW commit (never `--amend`).
EOF
)
    jq -n --arg r "$REASON" '{decision: "block", reason: $r}'
    exit 0
  else
    echo "[open-pr] uncommitted changes remain after $MAX_ATTEMPTS attempts on branch '$BRANCH' — giving up. User must commit manually." >&2
    rm -f "$ATTEMPT_FILE"
    exit 0
  fi
fi

# Tree is clean — reset retry counter for the next iteration.
rm -f "$ATTEMPT_FILE"

# 2. Push + PR step. Need gh.
if ! command -v gh >/dev/null 2>&1; then
  echo "[open-pr] gh CLI not found — skipping PR automation." >&2
  exit 0
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[open-pr] gh not authenticated — run: gh auth login" >&2
  exit 0
fi

git fetch origin main --quiet 2>/dev/null || true
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
if [[ "$AHEAD" -eq 0 ]]; then
  echo "[open-pr] '$BRANCH' has no commits ahead of origin/main — nothing to push." >&2
  exit 0
fi

echo "[open-pr] pushing '$BRANCH' to origin..." >&2
if ! git push -u origin "$BRANCH" 2>&1 | sed 's/^/[open-pr] /' >&2; then
  echo "[open-pr] push failed — skipping PR creation" >&2
  exit 0
fi

EXISTING=$(gh pr list --head "$BRANCH" --base main --state open --json url --jq '.[0].url // empty' 2>/dev/null || true)
if [[ -n "$EXISTING" ]]; then
  echo "[open-pr] updated existing PR: $EXISTING" >&2
  exit 0
fi

TITLE=$(git log -1 --pretty=%s)
COMMITS=$(git log origin/main..HEAD --pretty='- %s' --no-merges | head -10)
BODY=$(printf '## Summary\n\n%s\n\n---\n*Auto-opened by Claude Code Stop hook.*' "$COMMITS")

echo "[open-pr] creating PR..." >&2
if URL=$(gh pr create --base main --head "$BRANCH" --title "$TITLE" --body "$BODY" 2>&1); then
  echo "[open-pr] PR opened: $URL" >&2
else
  echo "[open-pr] PR creation failed:" >&2
  echo "$URL" | sed 's/^/[open-pr] /' >&2
fi
exit 0
