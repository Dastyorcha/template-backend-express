# /tdd — Red → Green → Refactor

Enforce the TDD cycle for a given feature or function.

**Argument:** feature description or function name (e.g. `/tdd add post endpoint`, `/tdd userService.deleteUser`)

## Steps

1. Read `docs/testing.md` for layer conventions and mocking patterns.
2. **Red** — Write the failing test first. Place it in the correct layer:
   - `tests/unit/<subject>.test.ts` for pure logic (mock all I/O)
   - `tests/integration/<flow>.test.ts` for HTTP flows (real DB + Redis mock)
     Run the test mentally to confirm it would fail before implementation exists. The test must be staged before proceeding.
3. **Green** — Write the minimum implementation to make the test pass. No gold-plating.
4. Run `npm run test` — confirm all tests pass.
5. **Refactor** — Apply `backend-architect` skill conventions. Extract duplication, tighten types, improve naming. Re-run tests after each change.
6. Run `npm run test:coverage` — flag if thresholds drop below lines:80 / functions:80 / branches:70.
7. Report: tests added, coverage delta, any refactor applied.

## Hard rules

- Never implement before the failing test is written.
- One concept per test: one assertion per `it` block.
- Arrange → Act → Assert structure.
