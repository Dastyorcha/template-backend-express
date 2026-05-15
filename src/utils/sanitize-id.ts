import { Request } from "express";
import mongoose from "mongoose";

/** Extract, sanitize, and validate a MongoDB ObjectId from `req.query.id`. Returns null if missing or invalid. */
export const sanitizeId = (req: Request): string | null => {
  const raw = req.query.id;
  if (!raw || typeof raw !== "string") return null;
  const id = raw.replace(/\\/g, "").trim();
  if (!id || id === "0") return null;
  if (!mongoose.isValidObjectId(id)) return null;
  return id;
};
