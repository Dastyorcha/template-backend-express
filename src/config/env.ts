import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  EMAIL_HOST: z.string().default("smtp.gmail.com"),
  EMAIL_PORT: z.string().default("587"),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("Template Backend <noreply@example.com>"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
