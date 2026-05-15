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
    EMAIL_HOST: "localhost",
    EMAIL_PORT: "587",
    EMAIL_USER: "",
    EMAIL_PASS: "",
    EMAIL_FROM: "test@example.com",
  },
}));

vi.mock("../../src/config/redis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { redis: new RedisMock() };
});

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

describe("Auth flow (integration)", () => {
  const email = "test@example.com";
  const password = "Password123!";
  const name = "Test User";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function registerAndVerify() {
    await request(app).post("/api/users/register").send({ name, email, password });
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    const htmlArg: string = sendEmail.mock.calls[0][0].html;
    const code = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];
    return request(app).post("/api/users/verify-email-for-register").send({ email, code });
  }

  it("POST /register — sends verification code", async () => {
    const res = await request(app).post("/api/users/register").send({ name, email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /register — rejects duplicate email after first verify", async () => {
    await registerAndVerify();
    vi.clearAllMocks();
    const res = await request(app).post("/api/users/register").send({ name, email, password });
    expect(res.status).toBe(409);
  });

  it("POST /verify-email-for-register — creates account and returns token pair", async () => {
    const res = await registerAndVerify();
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });

  it("POST /login — returns token pair", async () => {
    await registerAndVerify();
    vi.clearAllMocks();
    const res = await request(app).post("/api/users/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });

  it("GET /get-all-users — requires auth", async () => {
    const res = await request(app).get("/api/users/get-all-users");
    expect(res.status).toBe(401);
  });

  it("POST /forgot-password — same response for known and unknown emails (no enumeration)", async () => {
    const res1 = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "unknown@x.com" });
    await registerAndVerify();
    vi.clearAllMocks();
    const res2 = await request(app).post("/api/users/forgot-password").send({ email });
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.message).toBe(res2.body.message);
  });

  it("POST /resend-code — resends verification code", async () => {
    await request(app).post("/api/users/register").send({ name, email, password });
    const res = await request(app).post("/api/users/resend-code").send({ email });
    expect(res.status).toBe(200);
  });

  it("POST /resend-code — 404 if no pending registration", async () => {
    const res = await request(app).post("/api/users/resend-code").send({ email: "nobody@x.com" });
    expect(res.status).toBe(404);
  });

  it("POST /login — 404 for unknown email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nobody@x.com", password });
    expect(res.status).toBe(404);
  });

  it("POST /login — 400 for wrong password", async () => {
    await registerAndVerify();
    vi.clearAllMocks();
    const res = await request(app).post("/api/users/login").send({ email, password: "wrongpass" });
    expect(res.status).toBe(400);
  });

  it("POST /reset-password — resets password with valid code", async () => {
    await registerAndVerify();
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    sendEmail.mockClear();

    await request(app).post("/api/users/forgot-password").send({ email });
    const htmlArg: string = sendEmail.mock.calls[0][0].html;
    const resetCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];

    const newPassword = "NewPassword456!";
    const resetRes = await request(app)
      .post("/api/users/reset-password")
      .send({ email, code: resetCode, newPassword });
    expect(resetRes.status).toBe(200);

    sendEmail.mockClear();
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });
});
