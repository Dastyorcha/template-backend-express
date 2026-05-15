#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: append every file Claude modifies via Write/Edit/MultiEdit
# to a per-session list. Used by session-add.sh so commits stage only this
# session's changes, not other uncommitted work.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
SID=$(echo "$INPUT" | jq -r '.session_id // empty')
[[ -z "$SID" ]] && exit 0

case "$TOOL" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
[[ -z "$FILE" ]] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER_DIR="$PROJECT_DIR/.claude/.session-markers"
mkdir -p "$MARKER_DIR"

REL="${FILE#$PROJECT_DIR/}"
echo "$REL" >> "$MARKER_DIR/files-$SID.txt"
echo "$SID" > "$MARKER_DIR/last-session"
exit 0
