import { Request, Response } from "express";
import { authService } from "../../services/auth.service";
import sendResponse from "../../utils/response";

const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  if (!name || !email || !password) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await authService.register(name, email, password);
    if ("conflict" in result) {
      return sendResponse({
        res,
        statusCode: 409,
        success: false,
        message: "An account with this email already exists.",
      });
    }
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
  const { email, code } = req.body as { email: string; code: string };
  if (!email || !code) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await authService.verifyRegistration(email, code);
    if ("notFound" in result) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No pending verification found for this email.",
      });
    }
    if ("invalid" in result) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Invalid verification code.",
      });
    }
    return sendResponse({
      res,
      statusCode: 201,
      success: true,
      message: "Account created successfully.",
      data: {
        name: result.user.name,
        email: result.user.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
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
    const result = await authService.resendCode(email);
    if ("notFound" in result) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No pending verification found for this email.",
      });
    }
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
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await authService.login(email, password);
    if ("notFound" in result) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "No account found with this email.",
      });
    }
    if ("blocked" in result) {
      return sendResponse({
        res,
        statusCode: 403,
        success: false,
        message: "This account has been blocked.",
      });
    }
    if ("wrongPassword" in result) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Incorrect password." });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Logged in successfully.",
      data: {
        name: result.user.name,
        email: result.user.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        createdAt: result.user.createdAt,
      },
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

const refreshTokens = async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a refresh token.",
    });
  }

  try {
    const result = await authService.refreshTokens(refreshToken);
    if ("invalid" in result) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Tokens refreshed.",
      data: result,
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

const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a refresh token.",
    });
  }

  try {
    await authService.logout(refreshToken);
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Logged out successfully.",
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

export default {
  registerUser,
  verifyEmailForRegister,
  resendCode,
  loginUser,
  refreshTokens,
  logout,
};
