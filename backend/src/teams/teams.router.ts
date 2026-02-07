import { Router } from "express";
import { z } from "zod";

import { getAuthUserId } from "../common/auth.js";
import { sendError } from "../common/http.js";

import {
  TeamForbiddenError,
  TeamNotFoundError,
  type TeamsService,
} from "./teams.service.js";

import type { AuthService } from "../auth/auth.service.js";

const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

export const createTeamsRouter = (
  authService: AuthService,
  teamsService: TeamsService,
) => {
  const router = Router();

  router.get("/", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const teams = await teamsService.listTeams({ userId });
    return response.json({ teams });
  });

  router.post("/", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const parsed = createTeamSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return sendError(response, 400, "INVALID_INPUT", "Invalid team payload");
    }

    const team = await teamsService.createTeam({ userId }, parsed.data);
    return response.status(201).json({ team });
  });

  router.get("/:id/members", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    try {
      const members = await teamsService.listMembers(
        { userId },
        request.params.id,
      );
      return response.json({ members });
    } catch (error) {
      if (error instanceof TeamNotFoundError) {
        return sendError(response, 404, "TEAM_NOT_FOUND", "Team not found");
      }
      if (error instanceof TeamForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this team");
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to list members",
      );
    }
  });

  router.post("/:id/members", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const parsed = addMemberSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return sendError(
        response,
        400,
        "INVALID_INPUT",
        "Invalid member payload",
      );
    }

    try {
      const member = await teamsService.addMember(
        { userId },
        request.params.id,
        parsed.data,
      );
      return response.status(201).json({ member });
    } catch (error) {
      if (error instanceof TeamNotFoundError) {
        return sendError(
          response,
          404,
          "TEAM_NOT_FOUND",
          "Team or user not found",
        );
      }
      if (error instanceof TeamForbiddenError) {
        return sendError(
          response,
          403,
          "FORBIDDEN",
          "Only owner/admin can manage members",
        );
      }
      return sendError(response, 500, "INTERNAL_ERROR", "Failed to add member");
    }
  });

  router.patch("/:id/members/:userId", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const parsed = updateMemberSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return sendError(response, 400, "INVALID_INPUT", "Invalid role payload");
    }

    try {
      const member = await teamsService.updateMemberRole(
        { userId },
        request.params.id,
        request.params.userId,
        parsed.data.role,
      );
      return response.json({ member });
    } catch (error) {
      if (error instanceof TeamNotFoundError) {
        return sendError(
          response,
          404,
          "TEAM_NOT_FOUND",
          "Team or member not found",
        );
      }
      if (error instanceof TeamForbiddenError) {
        return sendError(
          response,
          403,
          "FORBIDDEN",
          "Role change is not allowed",
        );
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to update role",
      );
    }
  });

  router.delete("/:id/members/:userId", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    try {
      await teamsService.removeMember(
        { userId },
        request.params.id,
        request.params.userId,
      );
      return response.status(204).send();
    } catch (error) {
      if (error instanceof TeamNotFoundError) {
        return sendError(
          response,
          404,
          "TEAM_NOT_FOUND",
          "Team or member not found",
        );
      }
      if (error instanceof TeamForbiddenError) {
        return sendError(
          response,
          403,
          "FORBIDDEN",
          "Member removal is not allowed",
        );
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to remove member",
      );
    }
  });

  return router;
};
