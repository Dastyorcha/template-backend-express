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

import { codeStoreService } from "../../src/services/code-store.service";

const userDto = { email: "a@x.com", name: "Alice", password: "pass" };

describe("codeStoreService", () => {
  beforeEach(async () => {
    const { redis } = await import("../../src/config/redis");
    await redis.flushall();
  });

  describe("verification codes", () => {
    it("stores and retrieves a verification code", async () => {
      await codeStoreService.setVerificationCode("a@x.com", "123456", userDto);
      const record = await codeStoreService.getVerificationCode("a@x.com");
      expect(record?.code).toBe("123456");
      expect(record?.userDto.name).toBe("Alice");
    });

    it("returns null for unknown email", async () => {
      const record = await codeStoreService.getVerificationCode("nobody@x.com");
      expect(record).toBeNull();
    });

    it("deletes verification code", async () => {
      await codeStoreService.setVerificationCode("a@x.com", "123456", userDto);
      await codeStoreService.deleteVerificationCode("a@x.com");
      const record = await codeStoreService.getVerificationCode("a@x.com");
      expect(record).toBeNull();
    });

    it("overwrites existing code on re-set", async () => {
      await codeStoreService.setVerificationCode("a@x.com", "111111", userDto);
      await codeStoreService.setVerificationCode("a@x.com", "999999", userDto);
      const record = await codeStoreService.getVerificationCode("a@x.com");
      expect(record?.code).toBe("999999");
    });
  });

  describe("reset codes", () => {
    it("stores and retrieves a reset code", async () => {
      await codeStoreService.setResetCode("a@x.com", "654321", "user-id-123");
      const record = await codeStoreService.getResetCode("a@x.com");
      expect(record?.code).toBe("654321");
      expect(record?.userId).toBe("user-id-123");
    });

    it("returns null for unknown email", async () => {
      const record = await codeStoreService.getResetCode("nobody@x.com");
      expect(record).toBeNull();
    });

    it("deletes reset code", async () => {
      await codeStoreService.setResetCode("a@x.com", "654321", "user-id-123");
      await codeStoreService.deleteResetCode("a@x.com");
      const record = await codeStoreService.getResetCode("a@x.com");
      expect(record).toBeNull();
    });
  });
});
