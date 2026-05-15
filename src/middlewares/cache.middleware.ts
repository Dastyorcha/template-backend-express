import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

export const cacheMiddleware =
  (ttlSeconds: number) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.json(JSON.parse(cached) as unknown);
        return;
      }
    } catch {
      next();
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200) {
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };

export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    // non-fatal — cache will expire naturally
  }
}
