# Testing

## TDD cycle

**Red → Green → Refactor**. Never write implementation before the failing test exists.

1. **Red**: write a failing test. Stage/commit it before writing any implementation.
2. **Green**: write the minimum code to pass the test. No extras.
3. **Refactor**: apply `backend-architect` skill. Re-run tests after every change.

Use `/tdd <feature>` to enforce this cycle. Use `/test-gen <file>` to generate a full suite for an existing file.

## Test layers

| Layer       | Location                           | DB                | Redis        | HTTP      |
| ----------- | ---------------------------------- | ----------------- | ------------ | --------- |
| Unit        | `tests/unit/<subject>.test.ts`     | Memory (setup.ts) | ioredis-mock | No        |
| Integration | `tests/integration/<flow>.test.ts` | Memory (setup.ts) | ioredis-mock | supertest |

- Unit tests mock all I/O below the subject under test (repository, Redis, email, services).
- Integration tests use real MongoDB Memory Server + ioredis-mock; exercise the full HTTP stack via supertest.
- No real Redis or SMTP in any test.

## Coverage thresholds

Enforced in `vitest.config.ts` and on `pre-push`:

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 74%       |
| Functions  | 90%       |
| Branches   | 70%       |
| Statements | 74%       |

New code must not reduce overall coverage. `npm run test:coverage` fails the push if thresholds aren't met.

## Running tests

```bash
npm run test            # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # run with coverage report + threshold check
```

## File naming

- `tests/unit/auth.service.test.ts` mirrors `src/services/auth.service.ts`
- `tests/integration/refresh-token.test.ts` covers the refresh token HTTP flow
- One `describe` per function/method; one `it` per behavior

## Mocking patterns

### Redis (any file that touches services or middlewares using Redis)

```typescript
vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});
```

Flush between tests: `await redis.flushall()` in `beforeEach`.

### Email

```typescript
vi.mock("../../src/utils/send-email", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
```

### Repository (unit tests for services)

```typescript
vi.mock("../../src/repositories/user.repository", () => ({
  userRepository: { findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn(), updateById: vi.fn() },
}));
```

### Services (unit tests for controllers)

```typescript
vi.mock("../../src/services/auth.service", () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}));
```

### Env (any test that imports modules touching env.ts)

```typescript
vi.mock("../../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-key-at-least-16-chars",
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    REFRESH_TOKEN_SECRET: "test-refresh-secret-at-least-16c",
  },
}));
```

## Test structure (Arrange → Act → Assert)

```typescript
describe("authService.login", () => {
  it("returns notFound for unknown email", async () => {
    // Arrange
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    // Act
    const result = await authService.login("x@x.com", "pass");
    // Assert
    expect(result).toEqual({ notFound: true });
  });
});
```

One assertion concept per `it`. No logic (loops, conditionals) inside tests.
