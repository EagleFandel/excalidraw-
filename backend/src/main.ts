import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { createAuthRouter } from "./auth/auth.router.js";
import { AuthService } from "./auth/auth.service.js";
import { createFilesRouter } from "./files/files.router.js";
import { FilesService } from "./files/files.service.js";
import { prisma } from "./prisma.js";
import { createTeamsRouter } from "./teams/teams.router.js";
import { TeamsService } from "./teams/teams.service.js";
import { UsersService } from "./users/users.service.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const usersService = new UsersService();
const authService = new AuthService(usersService);
const teamsService = new TeamsService();
const filesService = new FilesService(teamsService);

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ ok: true, db: true });
  } catch {
    response.status(503).json({ ok: false, db: false });
  }
});

app.use("/auth", createAuthRouter(authService));
app.use("/files", createFilesRouter(authService, filesService));
app.use("/teams", createTeamsRouter(authService, teamsService));

const port = Number(process.env.PORT || 3005);
app.listen(port, () => {
  process.stdout.write(`[backend] listening on http://localhost:${port}\n`);
});
