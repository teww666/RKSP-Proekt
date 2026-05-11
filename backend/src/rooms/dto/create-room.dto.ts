import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  capacity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
