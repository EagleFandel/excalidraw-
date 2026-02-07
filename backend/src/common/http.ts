import type { Response } from "express";

export const sendError = (
  response: Response,
  status: number,
  code: string,
  message: string,
  extras?: Record<string, unknown>,
) => {
  response.status(status).json({
    error: {
      code,
      message,
    },
    ...(extras || {}),
  });
};
