# /test-gen — Generate a complete test suite

Generate tests for a given function, service, or endpoint.

**Argument:** file path or function name (e.g. `/test-gen src/services/user.service.ts`)

## Steps

1. Read the target file in full.
2. Read `docs/testing.md` for conventions and mocking patterns.
3. Identify all test cases:
   - Happy path for each exported function
   - Validation errors (missing fields, bad types)
   - Edge cases (empty results, boundary values)
   - Error paths (DB failure, Redis failure, not found)
4. Apply `backend-testing` skill for test structure.
5. Write tests grouped by `describe` block — one per function/method.
   - Unit test: mock all I/O (`userRepository`, `codeStoreService`, `tokenService`, `send-email`, `redis`)
   - Integration test: use real MongoDB Memory Server + ioredis-mock
6. Each test: Arrange → Act → Assert. No logic inside tests.
7. Run `npm run test` — all generated tests must pass. If a test fails, surface the implementation bug rather than weakening the test.
8. Report: tests written, coverage delta.
