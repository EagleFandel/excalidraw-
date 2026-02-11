import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
};

@Injectable()
export class ProxyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: RequestLike): Promise<string> {
    const forwardedFor = request.headers?.["x-forwarded-for"];

    if (Array.isArray(forwardedFor)) {
      const first = forwardedFor[0]?.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }

    if (typeof forwardedFor === "string") {
      const first = forwardedFor.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }

    const realIp = request.headers?.["x-real-ip"];
    if (Array.isArray(realIp)) {
      const first = realIp[0]?.trim();
      if (first) {
        return first;
      }
    }

    if (typeof realIp === "string" && realIp.trim()) {
      return realIp.trim();
    }

    if (request.ip && request.ip.trim()) {
      return request.ip.trim();
    }

    return "unknown";
  }
}
