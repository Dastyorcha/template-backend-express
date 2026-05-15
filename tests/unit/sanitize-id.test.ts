import { describe, it, expect } from "vitest";
import { sanitizeId } from "../../src/utils/sanitize-id";
import mongoose from "mongoose";

const mockReq = (id?: string) =>
  ({ query: id !== undefined ? { id } : {} }) as unknown as import("express").Request;

describe("sanitizeId", () => {
  it("returns a valid ObjectId string", () => {
    const validId = new mongoose.Types.ObjectId().toString();
    expect(sanitizeId(mockReq(validId))).toBe(validId);
  });

  it("returns null for missing id", () => {
    expect(sanitizeId(mockReq())).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeId(mockReq(""))).toBeNull();
  });

  it("returns null for '0'", () => {
    expect(sanitizeId(mockReq("0"))).toBeNull();
  });

  it("returns null for an invalid ObjectId", () => {
    expect(sanitizeId(mockReq("not-an-id"))).toBeNull();
  });

  it("strips backslashes before validating", () => {
    const validId = new mongoose.Types.ObjectId().toString();
    expect(sanitizeId(mockReq(`\\${validId}`))).toBe(validId);
  });
});
