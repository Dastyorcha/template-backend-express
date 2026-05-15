import { Request, Response } from "express";
import { authService } from "../../services/auth.service";
import { userService } from "../../services/user.service";
import { sanitizeId } from "../../utils/sanitize-id";
import sendResponse from "../../utils/response";

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  if (!email) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide your email.",
    });
  }

  try {
    await authService.forgotPassword(email);
    // Always 200 to avoid email enumeration
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "If an account exists, a reset code has been sent.",
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Internal server error.",
      error,
    });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body as {
    email: string;
    code: string;
    newPassword: string;
  };
  if (!email || !code || !newPassword) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await authService.resetPassword(email, code, newPassword);
    if ("notFound" in result) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "No password reset was requested for this email.",
      });
    }
    if ("invalid" in result) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Invalid reset code." });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Internal server error.",
      error,
    });
  }
};

const updateUserPassword = async (req: Request, res: Response) => {
  const id = sanitizeId(req);
  if (!id) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a valid user ID.",
    });
  }

  const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };
  if (!oldPassword || !newPassword) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await userService.changePassword(id, oldPassword, newPassword);
    if ("notFound" in result) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }
    if ("wrongPassword" in result) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        message: "Old password is incorrect.",
      });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Internal server error.",
      error,
    });
  }
};

export default { forgotPassword, resetPassword, updateUserPassword };
