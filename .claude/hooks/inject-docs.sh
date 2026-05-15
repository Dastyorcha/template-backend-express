#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "default"')
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER_DIR="$PROJECT_DIR/.claude/.session-markers"
MARKER="$MARKER_DIR/docs-injected-$SESSION_ID"

[[ -f "$MARKER" ]] && exit 0
[[ ! -d "$PROJECT_DIR/docs" ]] && exit 0

mkdir -p "$MARKER_DIR"
touch "$MARKER"

DOCS=""
while IFS= read -r -d '' f; do
  DOCS+=$'\n\n=== '"${f#$PROJECT_DIR/}"$' ===\n'
  DOCS+=$(cat "$f")
done < <(find "$PROJECT_DIR/docs" -type f \( -name "*.md" -o -name "*.txt" \) -print0)

jq -n --arg ctx "$DOCS" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("Project documentation (loaded once per session). Follow these conventions:\n" + $ctx)
  }
}'