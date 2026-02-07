import { Router } from "express";
import { z } from "zod";

import type { AuthService } from "./auth.service.js";

import type { Response } from "express";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const responseUser = (user: {
  id: string;
  email: string;
  displayName: string | null;
}) => ({
  user,
});

const sendError = (
  response: Response,
  status: number,
  code: string,
  message: string,
) => {
  response.status(status).json({
    error: {
      code,
      message,
    },
  });
};

export const createAuthRouter = (authService: AuthService) => {
  const router = Router();

  router.post("/register", async (request, response) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        response,
        400,
        "INVALID_INPUT",
        parsed.error.issues[0]?.message || "Invalid input",
      );
    }

    try {
      const user = await authService.register(parsed.data);
      authService.setAuthCookie(response, user);
      return response.status(201).json(responseUser(user));
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
        return sendError(
          response,
          409,
          "EMAIL_ALREADY_EXISTS",
          "Email is already registered",
        );
      }
      return sendError(response, 500, "INTERNAL_ERROR", "Failed to register");
    }
  });

  router.post("/login", async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        response,
        400,
        "INVALID_INPUT",
        parsed.error.issues[0]?.message || "Invalid input",
      );
    }

    try {
      const user = await authService.login(parsed.data);
      authService.setAuthCookie(response, user);
      return response.json(responseUser(user));
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return sendError(
          response,
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect",
        );
      }
      return sendError(response, 500, "INTERNAL_ERROR", "Failed to login");
    }
  });

  router.post("/logout", (_request, response) => {
    authService.clearAuthCookie(response);
    return response.status(204).send();
  });

  router.get("/me", async (request, response) => {
    const cookieName = authService.getAuthCookieName();
    const token = request.cookies[cookieName] as string | undefined;
    const payload = authService.verifyTokenFromCookie(token);

    if (!payload) {
      return response.status(401).json({ user: null });
    }

    const user = await authService.getCurrentUser(payload.sub);
    if (!user) {
      authService.clearAuthCookie(response);
      return response.status(401).json({ user: null });
    }

    return response.json(responseUser(user));
  });

  return router;
};
