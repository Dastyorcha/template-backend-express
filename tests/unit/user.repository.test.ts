import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import User from "../../src/models/user.model";
import { userRepository } from "../../src/repositories/user.repository";

async function createUser(overrides = {}) {
  const user = new User({
    name: "Alice",
    email: "alice@example.com",
    hashedPassword: "hashed123",
    loginedCount: 1,
    ...overrides,
  });
  return user.save();
}

describe("userRepository", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("create", () => {
    it("creates a user and returns the document", async () => {
      const user = await userRepository.create({
        name: "Bob",
        email: "bob@example.com",
        hashedPassword: "hashed",
      });
      expect(user.name).toBe("Bob");
      expect(user.email).toBe("bob@example.com");
      expect(user.loginedCount).toBe(1);
    });
  });

  describe("findById", () => {
    it("returns user without hashedPassword", async () => {
      const created = await createUser();
      const user = await userRepository.findById(String(created._id));
      expect(user).not.toBeNull();
      expect((user as unknown as Record<string, unknown>).hashedPassword).toBeUndefined();
    });

    it("returns null for unknown id", async () => {
      const user = await userRepository.findById(new mongoose.Types.ObjectId().toString());
      expect(user).toBeNull();
    });
  });

  describe("findByIdWithPassword", () => {
    it("returns user with hashedPassword", async () => {
      const created = await createUser();
      const user = await userRepository.findByIdWithPassword(String(created._id));
      expect(user?.hashedPassword).toBe("hashed123");
    });
  });

  describe("findByEmail", () => {
    it("finds user by email", async () => {
      await createUser();
      const user = await userRepository.findByEmail("alice@example.com");
      expect(user?.name).toBe("Alice");
    });

    it("returns null for unknown email", async () => {
      const user = await userRepository.findByEmail("nobody@example.com");
      expect(user).toBeNull();
    });
  });

  describe("updateById", () => {
    it("updates fields", async () => {
      const created = await createUser();
      await userRepository.updateById(String(created._id), { name: "Alice Updated" } as never);
      const updated = await userRepository.findById(String(created._id));
      expect(updated?.name).toBe("Alice Updated");
    });
  });

  describe("deleteById", () => {
    it("removes the user", async () => {
      const created = await createUser();
      await userRepository.deleteById(String(created._id));
      const user = await userRepository.findById(String(created._id));
      expect(user).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns all users without passwords", async () => {
      await createUser({ email: "a@x.com" });
      await createUser({ email: "b@x.com" });
      const users = await userRepository.findAll();
      expect(users).toHaveLength(2);
      users.forEach((u) =>
        expect((u as unknown as Record<string, unknown>).hashedPassword).toBeUndefined(),
      );
    });
  });

  describe("findPaginated", () => {
    it("returns correct slice and total count", async () => {
      for (let i = 0; i < 5; i++) {
        await createUser({ email: `user${i}@x.com` });
      }
      const [users, total] = await userRepository.findPaginated(0, 2);
      expect(users).toHaveLength(2);
      expect(total).toBe(5);
    });
  });
});
