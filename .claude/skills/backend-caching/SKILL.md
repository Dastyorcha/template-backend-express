# backend-caching skill

**Activates on:** `src/middlewares/cache*`, `src/config/redis*`, `src/services/code-store*`, `src/services/token*`, tasks involving "cache", "Redis", "TTL", "refresh token", "invalidat\*"

## Redis key namespaces

| Prefix     | Format                     | TTL                         | Purpose                        |
| ---------- | -------------------------- | --------------------------- | ------------------------------ |
| `verify:`  | `verify:<email>`           | 180s                        | Registration verification code |
| `reset:`   | `reset:<email>`            | 600s                        | Password reset code            |
| `refresh:` | `refresh:<userId>:<token>` | env-configured (default 7d) | Refresh token store            |
| `cache:`   | `cache:<originalUrl>`      | endpoint-specific           | Response cache                 |

## Cache-aside pattern

Check Redis → miss → query DB → set Redis → return. Never write-through in this template.

## Cache TTLs by endpoint

- `GET /get-all-users` → 60s
- `GET /get-users-page` → 30s

## Cache invalidation

After any mutation (create/update/delete/block), call:

```typescript
await clearCachePattern("cache:/api/users*");
```

This is called inside service methods — controllers stay unaware of caching.

## Code store rules

Use `codeStoreService` for all verification/reset codes. Never use in-memory Maps — they don't survive restarts and don't work across multiple instances.

## Refresh token rotation

Every `POST /refresh-token` call:

1. Validates old token in Redis
2. Deletes old token immediately
3. Issues new access + refresh pair
4. Stores new refresh token in Redis

Old token rejected on any subsequent use.

## Rate limiting

Redis store (`rate-limit-redis`) ensures limits survive restarts and work across multiple instances. Never use in-memory store in production.

## Testing

Mock `src/config/redis` with `ioredis-mock` in every test file that touches Redis:

```typescript
vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});
```

Never hit real Redis in unit or integration tests.

## Style-change sync

Redis key format or TTL changes → update `docs/redis.md`.
