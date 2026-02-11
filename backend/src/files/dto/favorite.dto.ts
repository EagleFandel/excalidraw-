import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class FavoriteDto {
  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  isFavorite!: boolean;
}
