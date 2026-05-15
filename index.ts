import "./src/config/env"; // validates env vars at boot — must be first
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import connectDB from "./src/config/db";
import { redis } from "./src/config/redis";
import userRoutes from "./src/routes/user.routes";
import { env } from "./src/config/env";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
  }),
});
app.use("/api/users/register", authLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/users/forgot-password", authLimiter);
app.use("/api/users/reset-password", authLimiter);

app.use("/api/users", userRoutes);

connectDB()
  .then(() => {
    app.listen(env.PORT, () => console.log(`Server running on http://localhost:${env.PORT}`));
  })
  .catch((err: unknown) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
