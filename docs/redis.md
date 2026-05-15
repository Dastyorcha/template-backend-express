# Redis

## Why Redis

Replaces in-memory Maps for code storage (TTL-native, multi-instance safe, survives restarts) and adds rate-limit persistence, response caching, and refresh token revocation.

## Client

`src/config/redis.ts` — single `ioredis` instance with `lazyConnect: true` so tests can inject `ioredis-mock` before any real connection fires.

```typescript
import { redis } from "../config/redis";
await redis.get("key");
await redis.setex("key", ttlSeconds, value);
await redis.del("key");
```

## Key namespaces

| Prefix     | Format                     | TTL                    | Purpose                      | Service                 |
| ---------- | -------------------------- | ---------------------- | ---------------------------- | ----------------------- |
| `verify:`  | `verify:<email>`           | 180s                   | Registration code + user DTO | `code-store.service.ts` |
| `reset:`   | `reset:<email>`            | 600s                   | Password reset code + userId | `code-store.service.ts` |
| `refresh:` | `refresh:<userId>:<token>` | `REFRESH_TOKEN_EXPIRY` | Refresh token store          | `token.service.ts`      |
| `cache:`   | `cache:<originalUrl>`      | endpoint-specific      | Response cache               | `cache.middleware.ts`   |

## Rate limiting

`RedisStore` from `rate-limit-redis` is used in `index.ts`. Limits survive server restarts and work across multiple instances. Current limit: 20 requests per 15 minutes on auth endpoints.

## Testing

Mock `src/config/redis` with `ioredis-mock` in every test that touches Redis:

```typescript
vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});
```

Always `await redis.flushall()` in `beforeEach` to isolate tests.

## Local development

`docker compose up` starts a `redis:7-alpine` container on port 6379 with a persistent volume. The `api` service in docker-compose sets `REDIS_URL=redis://redis:6379` automatically. For local dev without Docker, install Redis locally or use a cloud Redis instance and set `REDIS_URL` in `.env`.
