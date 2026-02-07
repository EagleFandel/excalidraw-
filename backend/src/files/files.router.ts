import { Router } from "express";
import { z } from "zod";

import { getAuthUserId } from "../common/auth.js";
import { sendError } from "../common/http.js";

import {
  ForbiddenError,
  FileNotFoundError,
  VersionConflictError,
  type FilesService,
} from "./files.service.js";

import type { AuthService } from "../auth/auth.service.js";

const listQuerySchema = z.object({
  scope: z.enum(["personal", "team"]).optional(),
  includeTrashed: z.union([z.literal("true"), z.literal("false")]).optional(),
  favoritesOnly: z.union([z.literal("true"), z.literal("false")]).optional(),
  teamId: z.string().trim().min(1).optional(),
});

const createFileSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  scope: z.enum(["personal", "team"]).optional(),
  teamId: z.string().trim().min(1).nullable().optional(),
  scene: z
    .object({
      elements: z.array(z.unknown()),
      appState: z.record(z.unknown()).optional(),
      files: z.record(z.unknown()).optional(),
    })
    .optional(),
});

const saveFileSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().trim().min(1).max(255).optional(),
  scene: z.object({
    elements: z.array(z.unknown()),
    appState: z.record(z.unknown()).optional(),
    files: z.record(z.unknown()).optional(),
  }),
});

const favoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export const createFilesRouter = (
  authService: AuthService,
  filesService: FilesService,
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

    const parsedQuery = listQuerySchema.safeParse(request.query || {});
    if (!parsedQuery.success) {
      return sendError(response, 400, "INVALID_INPUT", "Invalid query params");
    }

    if (parsedQuery.data.scope === "team" && !parsedQuery.data.teamId) {
      return sendError(response, 400, "INVALID_INPUT", "teamId is required");
    }

    try {
      const files = await filesService.listFiles(
        { userId },
        {
          scope: parsedQuery.data.scope,
          teamId: parsedQuery.data.teamId,
          includeTrashed: parsedQuery.data.includeTrashed === "true",
          favoritesOnly: parsedQuery.data.favoritesOnly === "true",
        },
      );
      return response.json({ files });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(
          response,
          403,
          "FORBIDDEN",
          "No access to this file scope",
        );
      }

      return sendError(response, 500, "INTERNAL_ERROR", "Failed to list files");
    }
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

    const parsedBody = createFileSchema.safeParse(request.body || {});
    if (!parsedBody.success) {
      return sendError(response, 400, "INVALID_INPUT", "Invalid file payload");
    }

    try {
      const file = await filesService.createPersonalFile(
        { userId },
        {
          title: parsedBody.data.title,
          teamId:
            parsedBody.data.scope === "team"
              ? parsedBody.data.teamId || null
              : null,
          scene: parsedBody.data.scene
            ? {
                elements: parsedBody.data.scene.elements,
                appState: parsedBody.data.scene.appState || {},
                files: parsedBody.data.scene.files || {},
              }
            : undefined,
        },
      );

      return response.status(201).json({ file });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(
          response,
          403,
          "FORBIDDEN",
          "No access to this file scope",
        );
      }

      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to create file",
      );
    }
  });

  router.get("/:id", async (request, response) => {
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
      const file = await filesService.getFile({ userId }, request.params.id);
      return response.json({ file });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      return sendError(response, 500, "INTERNAL_ERROR", "Failed to read file");
    }
  });

  router.put("/:id", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const parsedBody = saveFileSchema.safeParse(request.body || {});
    if (!parsedBody.success) {
      return sendError(response, 400, "INVALID_INPUT", "Invalid save payload");
    }

    try {
      const file = await filesService.saveFile(
        { userId },
        {
          fileId: request.params.id,
          version: parsedBody.data.version,
          title: parsedBody.data.title,
          scene: {
            elements: parsedBody.data.scene.elements,
            appState: parsedBody.data.scene.appState || {},
            files: parsedBody.data.scene.files || {},
          },
        },
      );

      return response.json({ file });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      if (error instanceof VersionConflictError) {
        return sendError(
          response,
          409,
          "VERSION_CONFLICT",
          "Version conflict",
          {
            currentVersion: error.currentVersion,
          },
        );
      }

      return sendError(response, 500, "INTERNAL_ERROR", "Failed to save file");
    }
  });

  router.delete("/:id", async (request, response) => {
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
      await filesService.trashFile({ userId }, request.params.id);
      return response.status(204).send();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to delete file",
      );
    }
  });

  router.post("/:id/restore", async (request, response) => {
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
      const file = await filesService.restoreFile(
        { userId },
        request.params.id,
      );
      return response.json({ file });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to restore file",
      );
    }
  });

  router.delete("/:id/permanent", async (request, response) => {
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
      await filesService.permanentlyDeleteFile({ userId }, request.params.id);
      return response.status(204).send();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to permanently delete file",
      );
    }
  });

  router.patch("/:id/favorite", async (request, response) => {
    const userId = getAuthUserId(request, authService);
    if (!userId) {
      return sendError(
        response,
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const parsedBody = favoriteSchema.safeParse(request.body || {});
    if (!parsedBody.success) {
      return sendError(
        response,
        400,
        "INVALID_INPUT",
        "Invalid favorite payload",
      );
    }

    try {
      const file = await filesService.setFavorite(
        { userId },
        request.params.id,
        parsedBody.data.isFavorite,
      );
      return response.json({ file });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return sendError(response, 403, "FORBIDDEN", "No access to this file");
      }
      if (error instanceof FileNotFoundError) {
        return sendError(response, 404, "FILE_NOT_FOUND", "File not found");
      }
      return sendError(
        response,
        500,
        "INTERNAL_ERROR",
        "Failed to update favorite",
      );
    }
  });

  return router;
};
