import "./src/config/env"; // validates env vars at boot — must be first
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import connectDB from "./src/config/db";
import userRoutes from "./src/routes/user.routes";
import { env } from "./src/config/env";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Rate-limit public auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
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
