import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import userRoutes from "../../src/routes/user.routes";

vi.mock("../../src/utils/send-email", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

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

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

async function registerAndLogin() {
  const email = `user_${Date.now()}@example.com`;
  const password = "Password123!";
  const name = "Test User";

  await request(app).post("/api/users/register").send({ name, email, password });
  const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
    typeof vi.fn
  >;
  const htmlArg: string = sendEmail.mock.calls.at(-1)![0].html;
  const code = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];
  await request(app).post("/api/users/verify-email-for-register").send({ email, code });

  sendEmail.mockClear();
  const loginRes = await request(app).post("/api/users/login").send({ email, password });
  return { email, password, ...loginRes.body.data } as {
    email: string;
    password: string;
    accessToken: string;
    refreshToken: string;
  };
}

describe("Refresh token flow (integration)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /refresh-token — issues new token pair", async () => {
    const { refreshToken } = await registerAndLogin();
    const res = await request(app).post("/api/users/refresh-token").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("POST /refresh-token — old token rejected after rotation", async () => {
    const { refreshToken } = await registerAndLogin();
    await request(app).post("/api/users/refresh-token").send({ refreshToken });

    const res = await request(app).post("/api/users/refresh-token").send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it("POST /logout — invalidates refresh token", async () => {
    const { refreshToken } = await registerAndLogin();
    const logoutRes = await request(app).post("/api/users/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const res = await request(app).post("/api/users/refresh-token").send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it("GET /get-all-users — rejected with refresh token used as access token", async () => {
    const { refreshToken } = await registerAndLogin();
    const res = await request(app)
      .get("/api/users/get-all-users")
      .set("Authorization", `Bearer ${refreshToken}`);
    expect(res.status).toBe(401);
  });

  it("POST /refresh-token — rejects invalid token", async () => {
    const res = await request(app)
      .post("/api/users/refresh-token")
      .send({ refreshToken: "garbage-token" });
    expect(res.status).toBe(401);
  });
});
