import { Response } from "express";

interface SendResponseOptions {
  res: Response | null;
  statusCode: number;
  success: boolean;
  message: string;
  data?: unknown;
  error?: unknown;
}

const sendResponse = ({ res, statusCode, success, message, data, error }: SendResponseOptions) => {
  if (!res) return;

  const body: Record<string, unknown> = { success, message };
  if (data !== undefined && data !== null) body.data = data;
  if (error !== undefined && error !== null) body.error = error;

  return res.status(statusCode).json(body);
};

export default sendResponse;
