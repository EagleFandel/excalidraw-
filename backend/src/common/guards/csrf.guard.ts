import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ForbiddenError } from "../exceptions/domain-errors";
import { AuthService } from "../../auth/auth.service";

type RequestLike = {
  method?: string;
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const method = (request.method || "GET").toUpperCase();

    if (!MUTATING_METHODS.has(method)) {
      return true;
    }

    const cookieName =
      this.configService.get<string>("CSRF_COOKIE_NAME") || "excplus-csrf";
    const headerName =
      this.configService.get<string>("CSRF_HEADER_NAME") || "x-csrf-token";

    const cookieToken = request.cookies?.[cookieName];
    const headerRaw = request.headers?.[headerName.toLowerCase()];
    const headerToken = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;

    if (!this.authService.verifyCsrfToken(cookieToken, headerToken)) {
      throw new ForbiddenError("Invalid CSRF token");
    }

    return true;
  }
}
