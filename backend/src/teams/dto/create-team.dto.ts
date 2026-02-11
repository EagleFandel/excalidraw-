import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTeamDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: "Design Team",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
