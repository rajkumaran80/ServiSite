import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierGroupType } from '@prisma/client';

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: ModifierGroupType, default: 'SINGLE_SELECT' })
  @IsEnum(ModifierGroupType)
  @IsOptional()
  type?: ModifierGroupType;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minSelect?: number;

  @ApiPropertyOptional({ description: 'null = unlimited' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxSelect?: number;

  @ApiPropertyOptional({ default: 0, description: 'First N selections are free (e.g. 2 free toppings)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  freeLimit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}
