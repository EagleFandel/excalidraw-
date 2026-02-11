import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    example: "alice@example.com",
    description: "User email",
  })
  @IsEmail()
  @IsString()
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 128,
    example: "P@ssw0rd-1234",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    maxLength: 64,
    example: "Alice",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;
}
