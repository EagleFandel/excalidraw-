import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { FileSceneDto } from "./file-scene.dto";

export class CreateFileDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 255,
    example: "Project Draft",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    enum: ["personal", "team"],
    default: "personal",
  })
  @IsOptional()
  @IsIn(["personal", "team"])
  scope?: "personal" | "team";

  @ApiPropertyOptional({
    example: "team_123",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  teamId?: string | null;

  @ApiPropertyOptional({
    type: () => FileSceneDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileSceneDto)
  scene?: FileSceneDto;
}
