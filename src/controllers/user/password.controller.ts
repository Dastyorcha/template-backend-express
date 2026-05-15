import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../../models/user.model";
import sendEmail from "../../utils/send-email";
import { passwordResetEmail } from "../../utils/email-templates";
import { sanitizeId } from "../../utils/sanitize-id";
import sendResponse from "../../utils/response";

const passwordResetCodes = new Map<string, { code: string; expiresAt: number; userId: string }>();

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Please provide your email.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 to avoid email enumeration
      return sendResponse({
        res,
        statusCode: 200,
        success: true,
        message: "If an account exists, a reset code has been sent.",
      });
    }

    const code = (Math.floor(Math.random() * 900000) + 100000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    passwordResetCodes.set(email, { code, expiresAt, userId: String(user._id) });

    await sendEmail({ to: email, subject: "Reset your password", html: passwordResetEmail(code) });

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
  try {
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

    const record = passwordResetCodes.get(email);

    if (!record) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "No password reset was requested for this email.",
      });
    }
    if (Date.now() > record.expiresAt) {
      passwordResetCodes.delete(email);
      return sendResponse({ res, statusCode: 400, success: false, message: "Reset code expired." });
    }
    if (record.code !== code) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Invalid reset code." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: record.userId }, { $set: { hashedPassword } });
    passwordResetCodes.delete(email);

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
  try {
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

    const user = await User.findById(id);
    if (!user) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!isMatch) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        message: "Old password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: id }, { $set: { hashedPassword } });

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
