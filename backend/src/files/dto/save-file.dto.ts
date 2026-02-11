import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { FileSceneDto } from "./file-scene.dto";

export class SaveFileDto {
  @ApiProperty({
    minimum: 1,
    example: 3,
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 255,
    example: "Updated Draft",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    type: () => FileSceneDto,
  })
  @ValidateNested()
  @Type(() => FileSceneDto)
  scene!: FileSceneDto;
}
