import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

async function registerAndLogin(suffix = "") {
  const email = `user${suffix}_${Date.now()}@example.com`;
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
  const { accessToken } = loginRes.body.data as { accessToken: string };
  return { accessToken, email, password, name };
}

async function getUserId(accessToken: string): Promise<string> {
  const res = await request(app)
    .get("/api/users/get-all-users")
    .set("Authorization", `Bearer ${accessToken}`);
  return res.body.data[0]._id as string;
}

describe("User management (integration)", () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(async () => {
    // flush redis cache between tests so cacheMiddleware doesn't serve stale data
    const { redis } = await import("../../src/config/redis");
    await redis.flushall();
  });

  it("GET /get-all-users — returns user list without hashedPassword", async () => {
    const { accessToken } = await registerAndLogin();
    const res = await request(app)
      .get("/api/users/get-all-users")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).not.toHaveProperty("hashedPassword");
  });

  it("GET /get-users-page — returns paginated result", async () => {
    const { accessToken } = await registerAndLogin();
    const res = await request(app)
      .get("/api/users/get-users-page?page=1&size=5")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalPages");
    expect(res.body.data).toHaveProperty("elements");
  });

  it("GET /get-all-users — 401 without token", async () => {
    const res = await request(app).get("/api/users/get-all-users");
    expect(res.status).toBe(401);
  });

  it("PUT /update-user-credentials — updates name and email", async () => {
    const { accessToken } = await registerAndLogin();
    const id = await getUserId(accessToken);
    const res = await request(app)
      .put(`/api/users/update-user-credentials?id=${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name", email: "updated@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
  });

  it("PUT /update-user-credentials — 400 without id", async () => {
    const { accessToken } = await registerAndLogin();
    const res = await request(app)
      .put("/api/users/update-user-credentials")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "New", email: "new@x.com" });
    expect(res.status).toBe(400);
  });

  it("PUT /toogle-block-user — blocks a user", async () => {
    const { accessToken } = await registerAndLogin("a");
    const { accessToken: token2 } = await registerAndLogin("b");
    const id = await getUserId(token2);
    const res = await request(app)
      .put(`/api/users/toogle-block-user?id=${id}&isBlocked=true`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it("PUT /toogle-block-user — 400 without id", async () => {
    const { accessToken } = await registerAndLogin();
    const res = await request(app)
      .put("/api/users/toogle-block-user?isBlocked=true")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("PUT /change-password — changes password with correct old password", async () => {
    const { accessToken, password } = await registerAndLogin();
    const id = await getUserId(accessToken);
    const res = await request(app)
      .put(`/api/users/change-password?id=${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: password, newPassword: "NewPass456!" });
    expect(res.status).toBe(200);
  });

  it("PUT /change-password — 401 for wrong old password", async () => {
    const { accessToken } = await registerAndLogin();
    const id = await getUserId(accessToken);
    const res = await request(app)
      .put(`/api/users/change-password?id=${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "wrongpass", newPassword: "new" });
    expect(res.status).toBe(401);
  });

  it("DELETE /delete-user — deletes a user", async () => {
    const { accessToken } = await registerAndLogin("del");
    const id = await getUserId(accessToken);
    const res = await request(app)
      .delete(`/api/users/delete-user?id=${id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it("DELETE /delete-user — 400 without id", async () => {
    const { accessToken } = await registerAndLogin();
    const res = await request(app)
      .delete("/api/users/delete-user")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("POST /forgot-password — 400 without email field", async () => {
    const res = await request(app).post("/api/users/forgot-password").send({});
    expect(res.status).toBe(400);
  });

  it("POST /reset-password — 400 missing fields", async () => {
    const res = await request(app).post("/api/users/reset-password").send({ email: "x@x.com" });
    expect(res.status).toBe(400);
  });

  it("POST /reset-password — 400 for unknown email", async () => {
    const res = await request(app)
      .post("/api/users/reset-password")
      .send({ email: "x@x.com", code: "123456", newPassword: "new" });
    expect(res.status).toBe(400);
  });
});
