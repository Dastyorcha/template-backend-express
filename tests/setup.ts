import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-key-at-least-16-chars";
  process.env.MONGO_URI = "placeholder";
  process.env.EMAIL_HOST = "localhost";
  process.env.EMAIL_PORT = "587";
  process.env.EMAIL_USER = "";
  process.env.EMAIL_PASS = "";
  process.env.EMAIL_FROM = "test@example.com";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.ACCESS_TOKEN_EXPIRY = "15m";
  process.env.REFRESH_TOKEN_EXPIRY = "7d";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-at-least-16c";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
