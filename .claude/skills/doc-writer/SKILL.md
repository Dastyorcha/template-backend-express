---
name: doc-writer
description: Manually triggered via `/doc-writer <topic>`. Documents a single topic across ALL related `docs/*.md` files in this repo. Uses the Doc map in `CLAUDE.md` to decide which docs are affected — never reads every doc. Creates new doc files when no existing one fits, and updates the Doc map in the same change.
---

# Doc Writer (backend)

Manually invoked. Documents a topic completely — every related doc, no half-coverage.

## Inputs

A free-form topic from the user (e.g. "OTP rate limiting", "presentation model", "new env var `SMTP_POOL_SIZE`"). Treat it as a small spec for what to record.

## Workflow

1. **Read the Doc map.** Open `CLAUDE.md` and read the `## Doc map` table. This is the only discovery step — **do not** read every file under `docs/`.
2. **Pick affected docs.** From the topic, list every doc whose `Covers` column intersects the topic. Examples:
   - "new POST /presentations route" → `api.md` + `architecture.md` (if a new layer file landed) + possibly `auth.md` (if protected) + possibly `caching.md` (if cached).
   - "added Redis key for OTP throttle" → `redis.md` + `auth.md` (flow) + `env.md` (if new TTL env).
   - A single topic almost always hits 2-4 docs. Stop only when you're sure no other doc is affected.
3. **Need a new doc?** If the topic does not fit any existing doc:
   - Create `docs/<kebab-name>.md` with H1 title, one-sentence summary, sections as needed.
   - Add a new row to the `## Doc map` table in `CLAUDE.md`.
   - Cross-link from any existing doc that mentions the new topic in passing.
4. **Read only the docs you will edit.** For each affected doc, read it first, then update in place — preserve existing tone, heading depth, and table style. Append new sections only when the topic doesn't fit an existing section.
5. **Update the Doc map.** If you created a new doc, added new sync triggers, or a doc's scope shifted, edit the `## Doc map` table in `CLAUDE.md`.
6. **Cross-references.** When the same fact appears in 2+ docs, the doc that owns it (per the map) holds the full version; others link to it with `see [doc-name.md](./doc-name.md#anchor)`. Never duplicate prose.

## Style

- Match the surrounding docs: factual, terse, code blocks for shapes/keys/commands, tables for enumerations.
- Reference exact file paths and exported names (`src/services/token-service.ts:generateTokenPair`).
- For env vars: schema entry in `env.md`, example value in `.env.example`, motivation one-liner.
- For routes: method + path + auth + request body + response envelope + error cases.
- For Redis keys: namespace, TTL, who writes, who reads, eviction trigger.
- For Mongoose models: full schema, indexes, virtuals, lifecycle hooks.

## What NOT to do

- Do not read every file in `docs/` to "explore". The Doc map is the index.
- Do not create a new doc when an existing one has a section that fits.
- Do not write a topic into only one doc when the Doc map says it spans multiple — partial coverage defeats the skill.
- Do not duplicate content across docs; link instead.
- Do not run `git add` / `git commit` / `git push` — the session hooks handle staging and the Stop hook auto-opens the PR.

## When unsure

If the topic is ambiguous (e.g. "document the cache"), ask the user one targeted question before writing. If a single doc would balloon past ~400 lines, propose splitting it before writing.
