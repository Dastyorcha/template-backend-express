import express from "express";
import authMiddleWare from "../middlewares/auth.middleware";
import { cacheMiddleware } from "../middlewares/cache.middleware";
import userController from "../controllers/user/user.controller";
import authController from "../controllers/user/auth.controller";
import passwordController from "../controllers/user/password.controller";

const router = express.Router();

// Public routes
router.post("/register", authController.registerUser);
router.post("/verify-email-for-register", authController.verifyEmailForRegister);
router.post("/resend-code", authController.resendCode);
router.post("/login", authController.loginUser);
router.post("/refresh-token", authController.refreshTokens);
router.post("/logout", authController.logout);
router.post("/forgot-password", passwordController.forgotPassword);
router.post("/reset-password", passwordController.resetPassword);

// Private routes (require valid access token in Authorization header)
router.get("/get-all-users", authMiddleWare, cacheMiddleware(60), userController.getAllUsers);
router.get(
  "/get-users-page",
  authMiddleWare,
  cacheMiddleware(30),
  userController.getUsersByPageSize,
);
router.put("/update-user-credentials", authMiddleWare, userController.updateUserCredentials);
router.delete("/delete-user", authMiddleWare, userController.deleteUser);
router.put("/toogle-block-user", authMiddleWare, userController.toogleBlockUser);
router.put("/change-password", authMiddleWare, passwordController.updateUserPassword);

export default router;
