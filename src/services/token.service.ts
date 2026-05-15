import crypto from "crypto";
import jwt from "jsonwebtoken";
import { redis } from "../config/redis";
import { env } from "../config/env";

function parseTTL(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600;
  const n = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * multipliers[unit];
}

export const tokenService = {
  generateTokenPair(userId: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign({ userId, type: "access" }, env.JWT_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = crypto.randomBytes(40).toString("hex");
    return { accessToken, refreshToken };
  },

  async storeRefreshToken(userId: string, refreshToken: string) {
    const ttl = parseTTL(env.REFRESH_TOKEN_EXPIRY);
    await redis.setex(`refresh:${userId}:${refreshToken}`, ttl, "1");
  },

  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const pattern = `refresh:*:${refreshToken}`;
    const keys = await redis.keys(pattern);
    if (!keys.length) return null;
    const key = keys[0];
    const userId = key.split(":")[1];
    return userId;
  },

  async revokeRefreshToken(userId: string, refreshToken: string) {
    await redis.del(`refresh:${userId}:${refreshToken}`);
  },

  async revokeAllUserTokens(userId: string) {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  },
};
