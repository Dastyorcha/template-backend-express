import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import sendResponse from "../utils/response";

interface TokenPayload extends JwtPayload {
  userId: string;
}

const authMiddleWare = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    sendResponse({ res, statusCode: 401, success: false, message: "Unauthorized: no token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    res.locals.user = { userId: decoded.userId };
    next();
  } catch {
    sendResponse({ res, statusCode: 401, success: false, message: "Unauthorized: invalid or expired token." });
  }
};

export default authMiddleWare;
