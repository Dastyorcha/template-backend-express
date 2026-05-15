Perform a guided refactor of the codebase (or a specific file/directory if one is passed as an argument).

Steps:

1. Read every file under `src/` (or the argument path).
2. Apply the `backend-architect` skill to identify:
   - Duplication across controllers that should be extracted to a service or util.
   - Controller functions doing business logic that belongs in `src/services/`.
   - Untyped or loosely-typed sections (`any`, implicit `any`, untyped `req.body`).
   - Direct `process.env` reads outside `src/config/env.ts`.
   - Repeated ID-sanitization patterns not using `sanitizeId`.
   - Any `res.json()` calls that bypass `sendResponse`.
3. Produce a **phased refactor plan**: each phase is a self-contained change that keeps the app working after it's applied. Order by risk (lowest first).
4. For each phase, show the specific diff.
5. ASK before applying. Do not touch public route URLs, HTTP methods, or request/response shapes without explicit approval — those are breaking API changes.
6. After applying, run `npm run typecheck` and `npm run lint` and report any new errors.
