#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
[[ -z "$FILE" || ! -f "$FILE" ]] && exit 0

case "$FILE" in
  *.js|*.jsx|*.ts|*.tsx|*.json|*.md|*.mdx|*.yml|*.yaml|*.css|*.html|Dockerfile|*.dockerfile)
    command -v npx >/dev/null 2>&1 || exit 0
    npx --no-install prettier --write --log-level=silent "$FILE" 2>/dev/null \
      || npx prettier --write --log-level=silent "$FILE" 2>/dev/null \
      || true
    ;;
esac
exit 0
