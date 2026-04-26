import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMenuItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isChefSpecial?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVegan?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVegetarian?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isGlutenFree?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number | null;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  batch?: number | null;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergens?: string[];

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: ['cat_id_1', 'cat_id_2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
