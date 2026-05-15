#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null  # drain stdin
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" || "$BRANCH" == "develop" ]]; then
  jq -n --arg b "$BRANCH" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("You are on protected branch \"" + $b + "\". Stop and ask the user before continuing. Suggested: `git checkout -b feature/<task-name>` then resume.")
    }
  }'
fi
exit 0