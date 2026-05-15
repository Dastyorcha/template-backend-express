import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});

import { Request, Response, NextFunction } from "express";
import { cacheMiddleware, clearCachePattern } from "../../src/middlewares/cache.middleware";
import { redis } from "../../src/config/redis";

function mockRes(): Response {
  const res = {
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(url = "/api/users/get-all-users"): Request {
  return { originalUrl: url } as Request;
}

describe("cacheMiddleware", () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  it("calls next() on cache miss", async () => {
    const next = vi.fn() as NextFunction;
    await cacheMiddleware(60)(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("returns cached JSON on cache hit", async () => {
    const key = "cache:/api/users/get-all-users";
    await redis.setex(key, 60, JSON.stringify({ success: true, data: [] }));

    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await cacheMiddleware(60)(mockReq(), res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    expect(next).not.toHaveBeenCalled();
  });

  it("stores response in Redis after a 200 cache miss", async () => {
    const res = mockRes();
    const next = vi.fn().mockImplementation(() => {
      res.json({ success: true, data: ["user1"] });
    }) as NextFunction;

    await cacheMiddleware(60)(mockReq(), res, next);

    const cached = await redis.get("cache:/api/users/get-all-users");
    expect(JSON.parse(cached!)).toEqual({ success: true, data: ["user1"] });
  });

  it("does not cache non-200 responses", async () => {
    const res = { ...mockRes(), statusCode: 500 } as Response;
    const next = vi.fn().mockImplementation(() => {
      res.json({ success: false });
    }) as NextFunction;

    await cacheMiddleware(60)(mockReq(), res, next);

    const cached = await redis.get("cache:/api/users/get-all-users");
    expect(cached).toBeNull();
  });
});

describe("clearCachePattern", () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  it("removes all keys matching pattern", async () => {
    await redis.set("cache:/api/users/get-all-users", "1");
    await redis.set("cache:/api/users/get-users-page", "2");
    await clearCachePattern("cache:/api/users*");
    expect(await redis.get("cache:/api/users/get-all-users")).toBeNull();
    expect(await redis.get("cache:/api/users/get-users-page")).toBeNull();
  });
});
