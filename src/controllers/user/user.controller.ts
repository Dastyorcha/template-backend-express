import { Request, Response } from "express";
import { userService } from "../../services/user.service";
import { sanitizeId } from "../../utils/sanitize-id";
import sendResponse from "../../utils/response";

const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Users retrieved.",
      data: users,
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

const getUsersByPageSize = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 10));

  try {
    const data = await userService.getUsersByPage(page, size);
    return sendResponse({ res, statusCode: 200, success: true, message: "Users retrieved.", data });
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

const updateUserCredentials = async (req: Request, res: Response) => {
  const id = sanitizeId(req);
  if (!id) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a valid user ID.",
    });
  }

  const { email, name } = req.body as { email: string; name: string };
  if (!email || !name) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide all fields.",
    });
  }

  try {
    const result = await userService.updateCredentials(id, name, email);
    if ("notFound" in result) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "User updated.",
      data: result.user,
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

const deleteUser = async (req: Request, res: Response) => {
  const id = sanitizeId(req);
  if (!id) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a valid user ID.",
    });
  }

  try {
    const result = await userService.deleteUser(id);
    if ("notFound" in result) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: `${result.name} deleted.`,
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

const toogleBlockUser = async (req: Request, res: Response) => {
  const id = sanitizeId(req);
  if (!id) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide a valid user ID.",
    });
  }

  const { isBlocked } = req.query as { isBlocked: string };
  if (isBlocked === undefined) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      message: "Please provide isBlocked query param.",
    });
  }

  try {
    const result = await userService.toggleBlock(id, isBlocked === "true");
    if ("notFound" in result) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }
    if ("unchanged" in result) {
      return sendResponse({
        res,
        statusCode: 409,
        success: false,
        message: `${result.user.name} is already ${result.user.isBlocked ? "blocked" : "unblocked"}.`,
      });
    }
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: `${result.user.name} ${result.isBlocked ? "blocked" : "unblocked"}.`,
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
  getAllUsers,
  getUsersByPageSize,
  updateUserCredentials,
  deleteUser,
  toogleBlockUser,
};
