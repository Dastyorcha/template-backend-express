import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Minimal env for tests
  process.env.JWT_SECRET = "test-secret-key-at-least-16-chars";
  process.env.MONGO_URI = "placeholder"; // overridden below
  process.env.EMAIL_HOST = "localhost";
  process.env.EMAIL_PORT = "587";
  process.env.EMAIL_USER = "";
  process.env.EMAIL_PASS = "";
  process.env.EMAIL_FROM = "test@example.com";

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
