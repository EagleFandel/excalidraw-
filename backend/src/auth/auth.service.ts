import argon2 from "argon2";
import jwt from "jsonwebtoken";

import type { UsersService } from "../users/users.service.js";

import type { StringValue } from "ms";
import type { Response } from "express";

type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type JwtPayload = {
  sub: string;
  email: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN =
  (process.env.JWT_EXPIRES_IN as StringValue | number | undefined) || "7d";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "excplus-auth";

export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<AuthUser> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersService.createUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });

    return this.toAuthUser(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isValid = await argon2.verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return this.toAuthUser(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.usersService.findById(userId);
    return user ? this.toAuthUser(user) : null;
  }

  setAuthCookie(response: Response, user: AuthUser) {
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    response.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: (process.env.AUTH_COOKIE_SECURE || "false") === "true",
      sameSite:
        (process.env.AUTH_COOKIE_SAME_SITE as "lax" | "strict" | "none") ||
        "lax",
      domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
      path: "/",
    });
  }

  clearAuthCookie(response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, {
      path: "/",
      domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    });
  }

  verifyTokenFromCookie(cookieValue: string | undefined): JwtPayload | null {
    if (!cookieValue) {
      return null;
    }

    try {
      const decoded = jwt.verify(cookieValue, JWT_SECRET) as JwtPayload;
      if (!decoded?.sub || !decoded?.email) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  getAuthCookieName() {
    return AUTH_COOKIE_NAME;
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    displayName: string | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  }
}
