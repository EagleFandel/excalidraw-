import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

import type { Request, Response } from "express";

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("csrf")
  csrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = this.authService.generateCsrfToken();
    this.authService.setCsrfCookie(response, csrfToken);
    return { csrfToken };
  }

  @Post("register")
  async register(@Body() input: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.register({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      displayName: input.displayName?.trim(),
    });

    this.authService.setAuthCookie(response, user);
    response.status(201);

    return { user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.login({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    this.authService.setAuthCookie(response, user);
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) response: Response) {
    const cookieName = this.authService.getAuthCookieName();
    const token = (response.req as RequestWithCookies)?.cookies?.[cookieName];
    const payload = this.authService.verifyTokenFromCookie(token);

    await this.authService.logLogout(payload?.sub || null, payload?.email);

    this.authService.clearAuthCookie(response);
    this.authService.setCsrfCookie(response, this.authService.generateCsrfToken());
  }

  @Get("me")
  async me(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieName = this.authService.getAuthCookieName();
    const token = request.cookies?.[cookieName];
    const payload = this.authService.verifyTokenFromCookie(token);

    if (!payload) {
      response.status(401);
      return { user: null };
    }

    const user = await this.authService.getCurrentUser(payload.sub);
    if (!user) {
      this.authService.clearAuthCookie(response);
      response.status(401);
      return { user: null };
    }

    return { user };
  }
}
