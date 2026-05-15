import { redis } from "../config/redis";

interface VerificationEntry {
  code: string;
  userDto: { email: string; name: string; password: string };
}

interface ResetEntry {
  code: string;
  userId: string;
}

const VERIFY_TTL = 180; // 3 minutes
const RESET_TTL = 600; // 10 minutes

export const codeStoreService = {
  async setVerificationCode(email: string, code: string, userDto: VerificationEntry["userDto"]) {
    await redis.setex(`verify:${email}`, VERIFY_TTL, JSON.stringify({ code, userDto }));
  },

  async getVerificationCode(email: string): Promise<VerificationEntry | null> {
    const raw = await redis.get(`verify:${email}`);
    return raw ? (JSON.parse(raw) as VerificationEntry) : null;
  },

  async deleteVerificationCode(email: string) {
    await redis.del(`verify:${email}`);
  },

  async setResetCode(email: string, code: string, userId: string) {
    await redis.setex(`reset:${email}`, RESET_TTL, JSON.stringify({ code, userId }));
  },

  async getResetCode(email: string): Promise<ResetEntry | null> {
    const raw = await redis.get(`reset:${email}`);
    return raw ? (JSON.parse(raw) as ResetEntry) : null;
  },

  async deleteResetCode(email: string) {
    await redis.del(`reset:${email}`);
  },
};
