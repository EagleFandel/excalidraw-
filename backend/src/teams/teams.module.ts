import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
