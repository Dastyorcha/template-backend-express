#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
[[ -z "$FILE" ]] && exit 0

PATTERNS=( '\.env($|\.)' '/secrets/' '/dist/' '/node_modules/' '/\.git/' '/build/' '/coverage/' )

for p in "${PATTERNS[@]}"; do
  if [[ "$FILE" =~ $p ]]; then
    jq -n --arg f "$FILE" --arg p "$p" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Refusing to write to \"" + $f + "\" — matches protected pattern " + $p)
      }
    }'
    exit 0
  fi
done
exit 0
