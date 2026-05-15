import { describe, it, expect, vi } from "vitest";
import sendResponse from "../../src/utils/response";

const mockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as import("express").Response;
};

describe("sendResponse", () => {
  it("returns success envelope with message", () => {
    const res = mockRes();
    sendResponse({ res, statusCode: 200, success: true, message: "OK" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "OK" });
  });

  it("includes data when provided", () => {
    const res = mockRes();
    sendResponse({ res, statusCode: 200, success: true, message: "OK", data: { id: "1" } });
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "OK", data: { id: "1" } });
  });

  it("omits data when null", () => {
    const res = mockRes();
    sendResponse({ res, statusCode: 200, success: true, message: "OK", data: null });
    const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).not.toHaveProperty("data");
  });

  it("includes error when provided", () => {
    const res = mockRes();
    const error = new Error("boom");
    sendResponse({ res, statusCode: 500, success: false, message: "Fail", error });
    const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).toHaveProperty("error");
  });

  it("does nothing when res is null", () => {
    expect(() => sendResponse({ res: null, statusCode: 200, success: true, message: "OK" })).not.toThrow();
  });
});
