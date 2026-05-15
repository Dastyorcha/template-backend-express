import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-key-at-least-16-chars",
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    REFRESH_TOKEN_SECRET: "test-refresh-secret-at-least-16c",
  },
}));

vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});

vi.mock("../../src/repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
  },
}));

vi.mock("../../src/services/code-store.service", () => ({
  codeStoreService: {
    setVerificationCode: vi.fn(),
    getVerificationCode: vi.fn(),
    deleteVerificationCode: vi.fn(),
    setResetCode: vi.fn(),
    getResetCode: vi.fn(),
    deleteResetCode: vi.fn(),
  },
}));

vi.mock("../../src/services/token.service", () => ({
  tokenService: {
    generateTokenPair: vi.fn().mockReturnValue({ accessToken: "acc", refreshToken: "ref" }),
    storeRefreshToken: vi.fn(),
    validateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  },
}));

vi.mock("../../src/utils/send-email", () => ({ default: vi.fn().mockResolvedValue(undefined) }));

import { authService } from "../../src/services/auth.service";
import { userRepository } from "../../src/repositories/user.repository";
import { codeStoreService } from "../../src/services/code-store.service";
import { tokenService } from "../../src/services/token.service";

const mockUser = {
  _id: "uid1",
  name: "Alice",
  email: "a@x.com",
  hashedPassword: "$2b$10$hash",
  isBlocked: false,
  loginedCount: 1,
  createdAt: new Date(),
};

describe("authService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("register", () => {
    it("returns conflict if email exists", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as never);
      const result = await authService.register("Alice", "a@x.com", "pass");
      expect(result).toEqual({ conflict: true });
    });

    it("sends code and returns sent if no existing user", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      const result = await authService.register("Alice", "a@x.com", "pass");
      expect(codeStoreService.setVerificationCode).toHaveBeenCalled();
      expect(result).toEqual({ sent: true });
    });
  });

  describe("verifyRegistration", () => {
    it("returns notFound if no pending code", async () => {
      vi.mocked(codeStoreService.getVerificationCode).mockResolvedValue(null);
      const result = await authService.verifyRegistration("a@x.com", "123456");
      expect(result).toEqual({ notFound: true });
    });

    it("returns invalid for wrong code", async () => {
      vi.mocked(codeStoreService.getVerificationCode).mockResolvedValue({
        code: "999999",
        userDto: { email: "a@x.com", name: "Alice", password: "pass" },
      });
      const result = await authService.verifyRegistration("a@x.com", "111111");
      expect(result).toEqual({ invalid: true });
    });

    it("creates user and returns tokens on valid code", async () => {
      vi.mocked(codeStoreService.getVerificationCode).mockResolvedValue({
        code: "123456",
        userDto: { email: "a@x.com", name: "Alice", password: "pass" },
      });
      vi.mocked(userRepository.create).mockResolvedValue(mockUser as never);
      const result = await authService.verifyRegistration("a@x.com", "123456");
      expect("user" in result).toBe(true);
      if ("user" in result) {
        expect(result.accessToken).toBe("acc");
        expect(result.refreshToken).toBe("ref");
      }
    });
  });

  describe("login", () => {
    it("returns notFound for unknown email", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      const result = await authService.login("x@x.com", "pass");
      expect(result).toEqual({ notFound: true });
    });

    it("returns blocked for blocked user", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        ...mockUser,
        isBlocked: true,
      } as never);
      const result = await authService.login("a@x.com", "pass");
      expect(result).toEqual({ blocked: true });
    });

    it("returns wrongPassword for bad password", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as never);
      const result = await authService.login("a@x.com", "wrongpass");
      expect(result).toEqual({ wrongPassword: true });
    });
  });

  describe("refreshTokens", () => {
    it("returns invalid for unknown refresh token", async () => {
      vi.mocked(tokenService.validateRefreshToken).mockResolvedValue(null);
      const result = await authService.refreshTokens("bad-token");
      expect(result).toEqual({ invalid: true });
    });

    it("rotates tokens for valid refresh token", async () => {
      vi.mocked(tokenService.validateRefreshToken).mockResolvedValue("uid1");
      const result = await authService.refreshTokens("good-token");
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith("uid1", "good-token");
      expect(tokenService.storeRefreshToken).toHaveBeenCalled();
      expect("accessToken" in result).toBe(true);
    });
  });

  describe("forgotPassword", () => {
    it("returns notFound for unknown email", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      const result = await authService.forgotPassword("x@x.com");
      expect(result).toEqual({ notFound: true });
    });

    it("sends reset code for known email", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as never);
      const result = await authService.forgotPassword("a@x.com");
      expect(codeStoreService.setResetCode).toHaveBeenCalled();
      expect(result).toEqual({ sent: true });
    });
  });

  describe("resetPassword", () => {
    it("returns notFound if no reset record", async () => {
      vi.mocked(codeStoreService.getResetCode).mockResolvedValue(null);
      const result = await authService.resetPassword("a@x.com", "123456", "newpass");
      expect(result).toEqual({ notFound: true });
    });

    it("returns invalid for wrong code", async () => {
      vi.mocked(codeStoreService.getResetCode).mockResolvedValue({
        code: "999999",
        userId: "uid1",
      });
      const result = await authService.resetPassword("a@x.com", "111111", "newpass");
      expect(result).toEqual({ invalid: true });
    });

    it("updates password and deletes code on success", async () => {
      vi.mocked(codeStoreService.getResetCode).mockResolvedValue({
        code: "123456",
        userId: "uid1",
      });
      vi.mocked(userRepository.updateById).mockResolvedValue(undefined);
      const result = await authService.resetPassword("a@x.com", "123456", "newpass");
      expect(userRepository.updateById).toHaveBeenCalled();
      expect(codeStoreService.deleteResetCode).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });
});
