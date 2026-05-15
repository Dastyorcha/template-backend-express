Document the topic provided in `$ARGUMENTS` across all related `docs/*.md` files.

Invoke the `doc-writer` skill at `.claude/skills/doc-writer/SKILL.md` and follow its workflow exactly:

1. Read the `## Doc map` table in `CLAUDE.md` — do not read every file in `docs/`.
2. From `$ARGUMENTS`, decide every affected doc (and whether a new doc is needed).
3. Read only the docs you will edit, then update them in place. Create a new `docs/<kebab-name>.md` if no existing doc fits.
4. Update the `## Doc map` table in `CLAUDE.md` if you created a doc, added sync triggers, or scope shifted.
5. Cross-link rather than duplicate prose.

If `$ARGUMENTS` is empty or too vague to map to docs, ask one targeted question before writing.

Do not run `git add` / `git commit` / `git push` — the session hooks handle staging and the Stop hook auto-opens the PR.
