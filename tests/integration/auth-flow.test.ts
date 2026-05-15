import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import userRoutes from "../../src/routes/user.routes";

// Stub email sending so tests don't need SMTP
vi.mock("../../src/utils/send-email", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Stub env module so controllers don't re-run zod validation
vi.mock("../../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-key-at-least-16-chars",
    EMAIL_HOST: "localhost",
    EMAIL_PORT: "587",
    EMAIL_USER: "",
    EMAIL_PASS: "",
    EMAIL_FROM: "test@example.com",
  },
}));

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

describe("Auth flow (integration)", () => {
  const email = "test@example.com";
  const password = "Password123!";
  const name = "Test User";
  let verifyCode: string;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /register — sends verification code", async () => {
    const res = await request(app).post("/api/users/register").send({ name, email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /register — rejects duplicate email after first verify", async () => {
    // Register + verify first
    await request(app).post("/api/users/register").send({ name, email, password });
    // Intercept the code by inspecting the sendEmail mock
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    const htmlArg: string = sendEmail.mock.calls[0][0].html;
    verifyCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];

    await request(app)
      .post("/api/users/verify-email-for-register")
      .send({ email, code: verifyCode });

    // Now try to register again
    const res = await request(app).post("/api/users/register").send({ name, email, password });
    expect(res.status).toBe(409);
  });

  it("POST /verify-email-for-register — creates account and returns token", async () => {
    await request(app).post("/api/users/register").send({ name, email, password });
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    const htmlArg: string = sendEmail.mock.calls[0][0].html;
    verifyCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];

    const res = await request(app)
      .post("/api/users/verify-email-for-register")
      .send({ email, code: verifyCode });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("token");
  });

  it("POST /login — returns token", async () => {
    // Setup: register + verify
    await request(app).post("/api/users/register").send({ name, email, password });
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    const htmlArg: string = sendEmail.mock.calls[0][0].html;
    verifyCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];
    await request(app)
      .post("/api/users/verify-email-for-register")
      .send({ email, code: verifyCode });

    const res = await request(app).post("/api/users/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
  });

  it("GET /get-all-users — requires auth", async () => {
    const res = await request(app).get("/api/users/get-all-users");
    expect(res.status).toBe(401);
  });

  it("POST /forgot-password — accepts known and unknown emails (no enumeration)", async () => {
    const res1 = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "unknown@x.com" });
    const res2 = await request(app).post("/api/users/forgot-password").send({ email });
    // Both return 200 to avoid email enumeration
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.message).toBe(res2.body.message);
  });

  it("POST /reset-password — resets password with valid code", async () => {
    // Setup: register + verify
    await request(app).post("/api/users/register").send({ name, email, password });
    const sendEmail = (await import("../../src/utils/send-email")).default as ReturnType<
      typeof vi.fn
    >;
    let htmlArg: string = sendEmail.mock.calls[0][0].html;
    verifyCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];
    await request(app)
      .post("/api/users/verify-email-for-register")
      .send({ email, code: verifyCode });

    // Forgot password
    sendEmail.mockClear();
    await request(app).post("/api/users/forgot-password").send({ email });
    htmlArg = sendEmail.mock.calls[0][0].html;
    const resetCode = (htmlArg.match(/>\s*(\d{6})\s*</) ?? [])[1];

    const newPassword = "NewPassword456!";
    const res = await request(app)
      .post("/api/users/reset-password")
      .send({ email, code: resetCode, newPassword });
    expect(res.status).toBe(200);

    // Login with new password should work
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });
});
