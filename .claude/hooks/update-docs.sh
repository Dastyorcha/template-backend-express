#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
[[ -z "$FILE" ]] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
[[ ! -d "$PROJECT_DIR/docs" ]] && exit 0

# Don't trigger when editing docs themselves (prevents loop)
case "$FILE" in
  *"/docs/"*|*.md) exit 0 ;;
esac

BASE=$(basename "$FILE")
STEM="${BASE%.*}"

RELATED=$(grep -rlEi --include="*.md" "(\b$BASE\b|\b$STEM\b)" "$PROJECT_DIR/docs" 2>/dev/null || true)
[[ -z "$RELATED" ]] && exit 0

MSG="You just modified \`${FILE#$PROJECT_DIR/}\`. These docs reference it and may need updates:"$'\n'
while IFS= read -r d; do MSG+="- \`${d#$PROJECT_DIR/}\`"$'\n'; done <<< "$RELATED"
MSG+=$'\nReview each one. If the change affects documented behavior, APIs, or examples, update the doc in the same task.'

jq -n --arg ctx "$MSG" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
