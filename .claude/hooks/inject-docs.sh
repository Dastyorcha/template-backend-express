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

# Determine which file is being edited
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')
REL="${TOOL_INPUT#$PROJECT_DIR/}"

pick_docs() {
  local rel="$1"
  local docs=()

  case "$rel" in
    src/routes/*|src/controllers/*)       docs=(api.md architecture.md) ;;
    src/services/auth*|src/services/code-store*|src/services/token*)
                                          docs=(auth.md architecture.md redis.md refresh-tokens.md) ;;
    src/services/*)                       docs=(architecture.md) ;;
    src/repositories/*)                   docs=(data-model.md architecture.md) ;;
    src/models/*)                         docs=(data-model.md) ;;
    src/middlewares/cache*|src/config/redis*)
                                          docs=(caching.md redis.md) ;;
    src/middlewares/auth*)                docs=(auth.md architecture.md) ;;
    src/middlewares/*)                    docs=(architecture.md) ;;
    src/config/env*)                      docs=(env.md) ;;
    tests/*)                              docs=(testing.md) ;;
    .claude/hooks/*)                      docs=(claude-hooks.md) ;;
    .claude/skills/*)                     docs=(claude-skills.md) ;;
    index.ts)                             docs=(architecture.md env.md) ;;
    *)                                    docs=(architecture.md) ;;
  esac

  echo "${docs[@]}"
}

SELECTED=$(pick_docs "$REL")

DOCS=""
for doc in $SELECTED; do
  f="$PROJECT_DIR/docs/$doc"
  [[ -f "$f" ]] || continue
  DOCS+=$'\n\n=== '"docs/${doc}"$' ===\n'
  DOCS+=$(cat "$f")
done

[[ -z "$DOCS" ]] && exit 0

jq -n --arg ctx "$DOCS" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("Project documentation (loaded once per session). Follow these conventions:\n" + $ctx)
  }
}'
