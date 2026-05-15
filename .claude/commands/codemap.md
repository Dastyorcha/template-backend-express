Regenerate `docs/codemap.md` from the current state of the repository.

Steps:

1. List all files under `src/` and the root entry file `index.ts` using `find src -type f -name "*.ts" | sort`.
2. For each file, read the first 30 lines (enough to see exports, interface names, and JSDoc) to derive a one-line purpose description.
3. Write `docs/codemap.md` with this format:

```
# Codemap

Last updated: <date>

## Entry point
- `index.ts` — <one-line purpose>

## src/config/
- `src/config/env.ts` — <purpose>
- `src/config/db.ts` — <purpose>

## src/models/
- `src/models/user.model.ts` — <purpose>

## src/routes/
...

## src/controllers/
...

## src/middlewares/
...

## src/utils/
...

## src/types/
...
```

4. If a file group has no files yet (e.g., `src/services/`), omit that section.
5. The file is idempotent — running this command twice with no changes in between produces the same output.
6. Do not read or summarize `node_modules`, `dist`, `tests`, or `coverage`.
