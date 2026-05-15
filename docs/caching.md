# Caching

## Cache middleware

`src/middlewares/cache.middleware.ts` implements a cache-aside pattern for idempotent GET endpoints.

```typescript
router.get("/get-all-users", authMiddleWare, cacheMiddleware(60), userController.getAllUsers);
```

On a cache miss, the middleware patches `res.json` to capture and store the response body in Redis before sending it. Only 200 responses are cached.

## Cached endpoints

| Endpoint              | TTL |
| --------------------- | --- |
| `GET /get-all-users`  | 60s |
| `GET /get-users-page` | 30s |

## Cache invalidation

After any user mutation (update credentials, delete, block/unblock), the service calls:

```typescript
await clearCachePattern("cache:/api/users*");
```

This is called inside service methods — controllers stay unaware of caching. Pattern uses Redis `KEYS` + `DEL`.

## Cache key format

`cache:<req.originalUrl>` — includes query params, so paginated responses are cached per page/size combination.

## When NOT to cache

- Mutation endpoints (POST, PUT, DELETE)
- User-specific responses (responses that differ per authenticated user)
- Endpoints where stale data causes correctness issues

## Testing

Mock Redis with `ioredis-mock`. See `tests/unit/cache.middleware.test.ts` for examples of testing cache hit, miss, population, and non-200 skip.
