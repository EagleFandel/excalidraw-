import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    example: "alice@example.com",
    description: "User email",
  })
  @IsEmail()
  @IsString()
  email!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 128,
    example: "P@ssw0rd-1234",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
