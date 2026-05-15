#!/usr/bin/env bash
set -euo pipefail

# Helper for Claude: stage only files this session has modified, then exit.
# Use this instead of `git add -A` so commits don't sweep up unrelated
# uncommitted work. Pair with `git commit -m "<msg>"`.
#
# Usage:
#   bash .claude/hooks/session-add.sh
#   git commit -m "<message>"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
MARKER_DIR="$PROJECT_DIR/.claude/.session-markers"
SID_FILE="$MARKER_DIR/last-session"

if [[ ! -f "$SID_FILE" ]]; then
  echo "[session-add] no session ID recorded yet — has Claude made any edit?" >&2
  exit 1
fi

SID=$(cat "$SID_FILE")
LIST="$MARKER_DIR/files-$SID.txt"

if [[ ! -f "$LIST" || ! -s "$LIST" ]]; then
  echo "[session-add] no files tracked for session $SID" >&2
  exit 1
fi

cd "$PROJECT_DIR"

FILES=()
while IFS= read -r f; do
  [[ -n "$f" ]] && FILES+=("$f")
done < <(sort -u "$LIST")
if [[ "${#FILES[@]}" -eq 0 ]]; then
  echo "[session-add] empty file list" >&2
  exit 1
fi

git add -- "${FILES[@]}" 2>/dev/null || {
  # Some files may have been deleted — retry with --all on each existing path
  for f in "${FILES[@]}"; do git add -- "$f" 2>/dev/null || true; done
}

STAGED=$(git diff --cached --name-only)
if [[ -z "$STAGED" ]]; then
  echo "[session-add] nothing new to stage (files unchanged or already committed)" >&2
  exit 0
fi

echo "[session-add] staged $(echo "$STAGED" | wc -l | tr -d ' ') file(s):"
echo "$STAGED" | sed 's/^/  /'
