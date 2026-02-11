import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddMemberDto {
  @ApiProperty({
    example: "bob@example.com",
  })
  @IsEmail()
  @IsString()
  email!: string;

  @ApiPropertyOptional({
    enum: ["owner", "admin", "member"],
    default: "member",
  })
  @IsOptional()
  @IsIn(["owner", "admin", "member"])
  role?: "owner" | "admin" | "member";
}
