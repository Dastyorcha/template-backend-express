import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../../models/user.model";
import generateToken from "../../utils/generatetoken";
import sendEmail from "../../utils/send-email";
import { verificationCodeEmail } from "../../utils/email-templates";
import sendResponse from "../../utils/response";

const verificationCodes = new Map<
  string,
  { code: string; expiresAt: number; userDto: { email: string; name: string; password: string } }
>();

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    if (!name || !email || !password) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Please provide all fields.",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return sendResponse({
        res,
        statusCode: 409,
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 3 * 60 * 1000;

    verificationCodes.set(email, { code, expiresAt, userDto: { email, name, password } });

    await sendEmail({ to: email, subject: "Verify your email", html: verificationCodeEmail(code) });

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Verification code sent to your email.",
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

const verifyEmailForRegister = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };

    if (!email || !code) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Please provide all fields.",
      });
    }

    const record = verificationCodes.get(email);

    if (!record) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No pending verification found for this email.",
      });
    }
    if (Date.now() > record.expiresAt) {
      verificationCodes.delete(email);
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Verification code expired.",
      });
    }
    if (record.code !== code) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Invalid verification code.",
      });
    }

    const { name, password } = record.userDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, hashedPassword, loginedCount: 1 });
    await newUser.save();
    verificationCodes.delete(email);

    const token = generateToken(String(newUser._id));

    return sendResponse({
      res,
      statusCode: 201,
      success: true,
      message: "Account created successfully.",
      data: { name: newUser.name, email: newUser.email, token, loginedCount: 1 },
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

const resendCode = async (req: Request, res: Response) => {
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

    const record = verificationCodes.get(email);
    if (!record) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No pending verification found for this email.",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 3 * 60 * 1000;

    verificationCodes.set(email, { code, expiresAt, userDto: record.userDto });

    await sendEmail({ to: email, subject: "Verify your email", html: verificationCodeEmail(code) });

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Verification code resent.",
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

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Please provide all fields.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No account found with this email.",
      });
    }

    if (user.isBlocked) {
      return sendResponse({
        res,
        statusCode: 403,
        success: false,
        message: "This account has been blocked.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Incorrect password." });
    }

    await User.updateOne({ email }, { $inc: { loginedCount: 1 } });

    const token = generateToken(String(user._id));

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Logged in successfully.",
      data: { name: user.name, email: user.email, token, createdAt: user.createdAt },
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

export default { registerUser, verifyEmailForRegister, resendCode, loginUser };
