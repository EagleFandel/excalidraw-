import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";
import { HealthModule } from "./health/health.module";
import { validateEnv } from "./config/env.validation";
import { FilesModule } from "./files/files.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";
import { MetricsController } from "./common/metrics/metrics.controller";
import { MetricsService } from "./common/metrics/metrics.service";
import { DocsController } from "./docs/docs.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    FilesModule,
    HealthModule,
  ],
  controllers: [MetricsController, DocsController],
  providers: [MetricsService, CsrfGuard, RateLimitGuard],
})
export class AppModule {}
