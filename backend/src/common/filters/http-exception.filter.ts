import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

import { DomainError } from "../exceptions/domain-errors";

type RequestLike = {
  requestId?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestLike>();

    const logError = (
      status: number,
      errorCode: string,
      message: string,
      stack?: string,
    ) => {
      this.logger.error(
        JSON.stringify({
          requestId: request?.requestId,
          method: request?.method,
          path: request?.originalUrl || request?.url,
          status,
          code: errorCode,
          message,
          ...(stack ? { stack } : {}),
        }),
      );
    };

    if (exception instanceof DomainError) {
      if (exception.status >= 500) {
        logError(
          exception.status,
          exception.code,
          exception.message,
          exception.stack,
        );
      }

      response.status(exception.status).json({
        error: {
          code: exception.code,
          message: exception.message,
        },
        ...(exception.extras || {}),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (status === HttpStatus.SERVICE_UNAVAILABLE) {
        response.status(HttpStatus.SERVICE_UNAVAILABLE).json(
          typeof body === "object" && body ? body : { ok: false, db: false },
        );
        return;
      }

      if (status === HttpStatus.BAD_REQUEST) {
        response.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: "INVALID_INPUT",
            message:
              typeof body === "string"
                ? body
                : (body as { message?: string | string[] })?.message?.toString() ||
                  "Invalid input",
          },
        });
        return;
      }

      response.status(status).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            (typeof body === "string"
              ? body
              : (body as { message?: string | string[] })?.message?.toString()) ||
            exception.message ||
            "Internal server error",
        },
      });

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        logError(
          status,
          "INTERNAL_ERROR",
          exception.message || "Internal server error",
          exception.stack,
        );
      }
      return;
    }

    logError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
}
