# backend-testing skill

**Activates on:** any `tests/**` file, `/tdd`, `/test-gen`, tasks involving "test", "spec", "coverage", "TDD"

## TDD cycle

Red → Green → Refactor. Never write implementation before the failing test exists. The test must be staged/committed before implementation begins.

## Test layers

| Layer       | Location                           | What to mock                                          |
| ----------- | ---------------------------------- | ----------------------------------------------------- |
| Unit        | `tests/unit/<subject>.test.ts`     | All I/O: repository, Redis, email, external services  |
| Integration | `tests/integration/<flow>.test.ts` | Only Redis (ioredis-mock); real MongoDB Memory Server |

No HTTP calls in unit tests. No real Redis or SMTP in any test.

## File naming

- `tests/unit/<subject>.test.ts` — one file per service/repository/middleware
- `tests/integration/<flow>.test.ts` — one file per user-facing flow

## Describe/it naming

```typescript
describe("functionName", () => {
  it("returns X when Y", () => { ... });
  it("throws Z when W", () => { ... });
});
```

## Arrange → Act → Assert

One assertion concept per `it` block. No logic inside tests.

```typescript
// Arrange
vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
// Act
const result = await authService.login("x@x.com", "pass");
// Assert
expect(result).toEqual({ notFound: true });
```

## Mocking patterns

```typescript
// Redis (all test files that touch Redis or services using it)
vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});

// Email
vi.mock("../../src/utils/send-email", () => ({ default: vi.fn().mockResolvedValue(undefined) }));

// Repository
vi.mock("../../src/repositories/user.repository", () => ({
  userRepository: { findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn(), updateById: vi.fn() },
}));

// Services
vi.mock("../../src/services/code-store.service", () => ({ codeStoreService: { ... } }));
vi.mock("../../src/services/token.service", () => ({ tokenService: { ... } }));
```

## Coverage rules

- Lines: 80% · Functions: 80% · Branches: 70%
- New code must not reduce overall coverage
- `npm run test:coverage` enforced on pre-push

## What to test per layer

- **Repository:** every method — happy path, not-found, pagination
- **Service:** all result variants (notFound, invalid, conflict, ok)
- **Controller:** HTTP status codes + response shape (via integration test)
- **Middleware:** cache hit, cache miss, cache population, non-200 skip

## Style-change sync

Test file changes that reveal a behavior change in source → update the relevant doc.
