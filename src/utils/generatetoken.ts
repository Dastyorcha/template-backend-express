import jwt from "jsonwebtoken";
import { env } from "../config/env";

const generateToken = (id: string | number): string => {
  return jwt.sign({ userId: id }, env.JWT_SECRET, { expiresIn: "72h" });
};

export default generateToken;
