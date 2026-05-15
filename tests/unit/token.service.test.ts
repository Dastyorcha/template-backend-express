import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});

vi.mock("../../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-key-at-least-16-chars",
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    REFRESH_TOKEN_SECRET: "test-refresh-secret-at-least-16c",
  },
}));

import jwt from "jsonwebtoken";
import { tokenService } from "../../src/services/token.service";

describe("tokenService", () => {
  const userId = "user-abc-123";

  beforeEach(async () => {
    const { redis } = await import("../../src/config/redis");
    await redis.flushall();
  });

  describe("generateTokenPair", () => {
    it("returns an accessToken and refreshToken", () => {
      const { accessToken, refreshToken } = tokenService.generateTokenPair(userId);
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
      expect(refreshToken).toHaveLength(80); // 40 bytes hex
    });

    it("accessToken contains userId and type=access", () => {
      const { accessToken } = tokenService.generateTokenPair(userId);
      const decoded = jwt.decode(accessToken) as Record<string, unknown>;
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe("access");
    });
  });

  describe("storeRefreshToken / validateRefreshToken", () => {
    it("stored token resolves to userId", async () => {
      const { refreshToken } = tokenService.generateTokenPair(userId);
      await tokenService.storeRefreshToken(userId, refreshToken);
      const resolved = await tokenService.validateRefreshToken(refreshToken);
      expect(resolved).toBe(userId);
    });

    it("unknown token returns null", async () => {
      const resolved = await tokenService.validateRefreshToken("totally-fake-token");
      expect(resolved).toBeNull();
    });
  });

  describe("revokeRefreshToken", () => {
    it("revoked token returns null on validate", async () => {
      const { refreshToken } = tokenService.generateTokenPair(userId);
      await tokenService.storeRefreshToken(userId, refreshToken);
      await tokenService.revokeRefreshToken(userId, refreshToken);
      const resolved = await tokenService.validateRefreshToken(refreshToken);
      expect(resolved).toBeNull();
    });
  });

  describe("revokeAllUserTokens", () => {
    it("removes all tokens for a user", async () => {
      const { refreshToken: t1 } = tokenService.generateTokenPair(userId);
      const { refreshToken: t2 } = tokenService.generateTokenPair(userId);
      await tokenService.storeRefreshToken(userId, t1);
      await tokenService.storeRefreshToken(userId, t2);

      await tokenService.revokeAllUserTokens(userId);

      expect(await tokenService.validateRefreshToken(t1)).toBeNull();
      expect(await tokenService.validateRefreshToken(t2)).toBeNull();
    });
  });
});
