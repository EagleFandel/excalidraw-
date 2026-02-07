import { Controller, Get, Header } from "@nestjs/common";

const OPENAPI_DOC = {
  openapi: "3.0.3",
  info: {
    title: "Excalidraw+ API",
    version: "1.0.0",
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
      },
    },
    "/api/auth/csrf": {
      get: {
        summary: "Get CSRF token",
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register",
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login",
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Logout",
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Current user",
      },
    },
    "/api/files": {
      get: {
        summary: "List files",
      },
      post: {
        summary: "Create file",
      },
    },
    "/api/files/{id}": {
      get: {
        summary: "Get file",
      },
      put: {
        summary: "Save file",
      },
      delete: {
        summary: "Trash file",
      },
    },
    "/api/files/{id}/restore": {
      post: {
        summary: "Restore file",
      },
    },
    "/api/files/{id}/permanent": {
      delete: {
        summary: "Permanently delete file",
      },
    },
    "/api/files/{id}/favorite": {
      patch: {
        summary: "Set favorite",
      },
    },
    "/api/teams": {
      get: {
        summary: "List teams",
      },
      post: {
        summary: "Create team",
      },
    },
    "/api/teams/{id}/members": {
      get: {
        summary: "List members",
      },
      post: {
        summary: "Add member",
      },
    },
    "/api/teams/{id}/members/{userId}": {
      patch: {
        summary: "Update member role",
      },
      delete: {
        summary: "Remove member",
      },
    },
  },
} as const;

@Controller()
export class DocsController {
  @Get("docs")
  @Header("Content-Type", "text/html; charset=utf-8")
  getDocsHtml() {
    const serialized = JSON.stringify(OPENAPI_DOC, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Excalidraw+ API Docs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Inter, system-ui, Arial, sans-serif; margin: 24px; }
      code, pre { background: #f5f5f5; padding: 2px 4px; border-radius: 4px; }
      pre { padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>Excalidraw+ API Docs</h1>
    <p>OpenAPI JSON is available at <code>/api/docs-json</code>.</p>
    <pre>${serialized}</pre>
  </body>
</html>`;
  }

  @Get("docs-json")
  getDocsJson() {
    return OPENAPI_DOC;
  }
}
