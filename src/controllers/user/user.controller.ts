import { Request, Response } from "express";
import User from "../../models/user.model";
import { sanitizeId } from "../../utils/sanitize-id";
import sendResponse from "../../utils/response";

const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find().select("-hashedPassword");
    return sendResponse({ res, statusCode: 200, success: true, message: "Users retrieved.", data: users });
  } catch (error) {
    return sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error });
  }
};

const getUsersByPageSize = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 10));
    const skip = (page - 1) * size;

    const [users, elements] = await Promise.all([
      User.find().skip(skip).limit(size).select("-hashedPassword"),
      User.countDocuments(),
    ]);

    const totalPages = Math.ceil(elements / size) || 1;

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Users retrieved.",
      data: { data: users, elements, totalPages, page, size },
    });
  } catch (error) {
    return sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error });
  }
};

const updateUserCredentials = async (req: Request, res: Response) => {
  try {
    const id = sanitizeId(req);
    if (!id) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Please provide a valid user ID." });
    }

    const { email, name } = req.body as { email: string; name: string };
    if (!email || !name) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Please provide all fields." });
    }

    const user = await User.findById(id);
    if (!user) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }

    await User.updateOne({ _id: id }, { $set: { name, email } });

    const updated = await User.findById(id).select("-hashedPassword");
    return sendResponse({ res, statusCode: 200, success: true, message: "User updated.", data: updated });
  } catch (error) {
    return sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = sanitizeId(req);
    if (!id) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Please provide a valid user ID." });
    }

    const user = await User.findById(id);
    if (!user) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }

    await User.findByIdAndDelete(id);
    return sendResponse({ res, statusCode: 200, success: true, message: `${user.name} deleted.` });
  } catch (error) {
    return sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error });
  }
};

const toogleBlockUser = async (req: Request, res: Response) => {
  try {
    const id = sanitizeId(req);
    if (!id) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Please provide a valid user ID." });
    }

    const { isBlocked } = req.query as { isBlocked: string };
    if (isBlocked === undefined) {
      return sendResponse({ res, statusCode: 400, success: false, message: "Please provide isBlocked query param." });
    }

    const user = await User.findById(id);
    if (!user) {
      return sendResponse({ res, statusCode: 404, success: false, message: "User not found." });
    }

    const targetState = isBlocked === "true";
    if (user.isBlocked === targetState) {
      return sendResponse({ res, statusCode: 409, success: false, message: `${user.name} is already ${targetState ? "blocked" : "unblocked"}.` });
    }

    await User.updateOne({ _id: id }, { $set: { isBlocked: targetState } });
    return sendResponse({ res, statusCode: 200, success: true, message: `${user.name} ${targetState ? "blocked" : "unblocked"}.` });
  } catch (error) {
    return sendResponse({ res, statusCode: 500, success: false, message: "Internal server error.", error });
  }
};

export default { getAllUsers, getUsersByPageSize, updateUserCredentials, deleteUser, toogleBlockUser };
