Review the current branch's changes against `main` (or staged changes if not on a feature branch) using the `backend-architect` and `api-security-reviewer` skills.

Steps:

1. Run `git diff origin/main...HEAD --name-only 2>/dev/null || git diff --name-only HEAD` to list changed files. If no git repo, list all files under `src/`.
2. Read each changed file in full.
3. Apply the `backend-architect` skill: check layering, response envelope usage, naming, async/error handling, env access, Mongoose conventions, route structure.
4. Apply the `api-security-reviewer` skill: run through the full security checklist against the changed files.
5. Output a findings table:

| Severity | File:Line | Issue | Suggested fix |
| -------- | --------- | ----- | ------------- |

6. Follow the table with a **Passed checks** section listing items that are correctly implemented.
7. If there are CRITICAL or HIGH findings, propose the specific diffs needed to fix them and ask whether to apply them.
8. If all findings are MEDIUM/LOW, summarize the improvements and ask whether to apply any.

Do not modify any files without explicit confirmation.
