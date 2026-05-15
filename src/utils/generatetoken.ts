import jwt from "jsonwebtoken";
import { env } from "../config/env";

const generateToken = (id: string | number): string => {
  return jwt.sign({ userId: id, type: "access" }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });
};

export default generateToken;
