import { IsIn, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ListFilesQuery {
  @ApiPropertyOptional({
    enum: ["personal", "team"],
  })
  @IsOptional()
  @IsIn(["personal", "team"])
  scope?: "personal" | "team";

  @ApiPropertyOptional({
    enum: ["true", "false"],
    default: "false",
  })
  @IsOptional()
  @IsIn(["true", "false"])
  includeTrashed?: "true" | "false";

  @ApiPropertyOptional({
    enum: ["true", "false"],
    default: "false",
  })
  @IsOptional()
  @IsIn(["true", "false"])
  favoritesOnly?: "true" | "false";

  @ApiPropertyOptional({
    example: "team_123",
  })
  @IsOptional()
  @IsString()
  teamId?: string;
}
