#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
[[ -z "$CONTENT" ]] && exit 0
command -v gitleaks >/dev/null 2>&1 || exit 0

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
printf '%s' "$CONTENT" > "$TMP"

if ! gitleaks detect --source "$TMP" --no-git --no-banner --redact --exit-code 1 >/dev/null 2>&1; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "gitleaks detected a secret in the proposed content. Remove the credential and load it from env vars or a secret manager."
    }
  }'
fi
exit 0