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
    findAll: vi.fn(),
    findPaginated: vi.fn(),
    findById: vi.fn(),
    findByIdWithPassword: vi.fn(),
    deleteById: vi.fn(),
    updateById: vi.fn(),
  },
}));

vi.mock("../../src/services/token.service", () => ({
  tokenService: {
    revokeAllUserTokens: vi.fn(),
  },
}));

vi.mock("../../src/middlewares/cache.middleware", () => ({
  clearCachePattern: vi.fn(),
}));

import { userService } from "../../src/services/user.service";
import { userRepository } from "../../src/repositories/user.repository";
import { tokenService } from "../../src/services/token.service";

const mockUser = {
  _id: "uid1",
  name: "Alice",
  email: "alice@example.com",
  hashedPassword: "$2b$10$hash",
  isBlocked: false,
  loginedCount: 1,
  createdAt: new Date(),
};

describe("userService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAllUsers", () => {
    it("returns all users", async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([mockUser] as never);
      const users = await userService.getAllUsers();
      expect(users).toHaveLength(1);
    });
  });

  describe("getUsersByPage", () => {
    it("returns paginated result", async () => {
      vi.mocked(userRepository.findPaginated).mockResolvedValue([[mockUser], 5] as never);
      const result = await userService.getUsersByPage(1, 2);
      expect(result.elements).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.size).toBe(2);
    });
  });

  describe("updateCredentials", () => {
    it("returns notFound for unknown id", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      const result = await userService.updateCredentials("uid1", "Bob", "b@x.com");
      expect(result).toEqual({ notFound: true });
    });

    it("updates and returns updated user", async () => {
      vi.mocked(userRepository.findById)
        .mockResolvedValueOnce(mockUser as never)
        .mockResolvedValueOnce({ ...mockUser, name: "Bob" } as never);
      vi.mocked(userRepository.updateById).mockResolvedValue(undefined);
      const result = await userService.updateCredentials("uid1", "Bob", "b@x.com");
      expect("user" in result).toBe(true);
    });
  });

  describe("deleteUser", () => {
    it("returns notFound for unknown id", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      const result = await userService.deleteUser("uid1");
      expect(result).toEqual({ notFound: true });
    });

    it("deletes user and revokes tokens", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as never);
      vi.mocked(userRepository.deleteById).mockResolvedValue(mockUser as never);
      vi.mocked(tokenService.revokeAllUserTokens).mockResolvedValue(undefined);
      const result = await userService.deleteUser("uid1");
      expect(result).toEqual({ name: "Alice" });
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith("uid1");
    });
  });

  describe("toggleBlock", () => {
    it("returns notFound for unknown id", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      const result = await userService.toggleBlock("uid1", true);
      expect(result).toEqual({ notFound: true });
    });

    it("returns unchanged if already in target state", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        ...mockUser,
        isBlocked: true,
      } as never);
      const result = await userService.toggleBlock("uid1", true);
      expect("unchanged" in result).toBe(true);
    });

    it("blocks user and revokes tokens", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as never);
      vi.mocked(userRepository.updateById).mockResolvedValue(undefined);
      vi.mocked(tokenService.revokeAllUserTokens).mockResolvedValue(undefined);
      const result = await userService.toggleBlock("uid1", true);
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith("uid1");
      expect("isBlocked" in result).toBe(true);
    });

    it("unblocks user without revoking tokens", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        ...mockUser,
        isBlocked: true,
      } as never);
      vi.mocked(userRepository.updateById).mockResolvedValue(undefined);
      await userService.toggleBlock("uid1", false);
      expect(tokenService.revokeAllUserTokens).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("returns notFound for unknown id", async () => {
      vi.mocked(userRepository.findByIdWithPassword).mockResolvedValue(null);
      const result = await userService.changePassword("uid1", "old", "new");
      expect(result).toEqual({ notFound: true });
    });

    it("returns wrongPassword for bad old password", async () => {
      vi.mocked(userRepository.findByIdWithPassword).mockResolvedValue(mockUser as never);
      const result = await userService.changePassword("uid1", "wrongpass", "new");
      expect(result).toEqual({ wrongPassword: true });
    });
  });
});
