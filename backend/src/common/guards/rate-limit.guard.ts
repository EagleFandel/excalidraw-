import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import { DomainError } from "../exceptions/domain-errors";

type RequestLike = {
  ip?: string;
  method?: string;
  path?: string;
  originalUrl?: string;
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly exemptAuthPaths = new Set([
    "/api/auth/register",
    "/api/auth/login",
  ]);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const method = (request.method || "GET").toUpperCase();
    const path = request.originalUrl || request.path || "";
    const requestId = request.requestId || randomUUID();

    if (path === "/api/auth/csrf" || this.exemptAuthPaths.has(path)) {
      return true;
    }

    const ip = this.resolveClientIp(request, requestId);

    const isAuthPath = path.includes("/auth/");
    const ttlSeconds = Number(
      this.configService.get<number>(
        isAuthPath ? "AUTH_THROTTLE_TTL" : "THROTTLE_TTL",
      ) || 60,
    );
    const limit = Number(
      this.configService.get<number>(
        isAuthPath ? "AUTH_THROTTLE_LIMIT" : "THROTTLE_LIMIT",
      ) || (isAuthPath ? 10 : 120),
    );

    const key = `${ip}:${method}:${isAuthPath ? "auth" : "default"}`;
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + ttlSeconds * 1000,
      });
      return true;
    }

    if (current.count >= limit) {
      throw new DomainError("RATE_LIMITED", 429, "Too many requests");
    }

    current.count += 1;
    return true;
  }

  private resolveClientIp(request: RequestLike, requestId: string) {
    const fromForwardedFor = request.headers?.["x-forwarded-for"];
    if (Array.isArray(fromForwardedFor)) {
      const first = fromForwardedFor[0]?.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }

    if (typeof fromForwardedFor === "string") {
      const first = fromForwardedFor.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }

    const fromRealIp = request.headers?.["x-real-ip"];
    if (Array.isArray(fromRealIp)) {
      const first = fromRealIp[0]?.trim();
      if (first) {
        return first;
      }
    }

    if (typeof fromRealIp === "string" && fromRealIp.trim()) {
      return fromRealIp.trim();
    }

    if (request.ip && request.ip.trim()) {
      return request.ip.trim();
    }

    return `unknown:${requestId}`;
  }
}
