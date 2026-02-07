import type { AuthService } from "../auth/auth.service.js";
import type { Request } from "express";

export const getAuthUserId = (request: Request, authService: AuthService) => {
  const cookieName = authService.getAuthCookieName();
  const token = request.cookies[cookieName] as string | undefined;
  const payload = authService.verifyTokenFromCookie(token);

  if (!payload) {
    return null;
  }

  return payload.sub;
};
