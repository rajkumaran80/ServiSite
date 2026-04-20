import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Appetizers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Start your meal with our delicious appetizers' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Perfect for sharing' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  headerText?: string;

  @ApiPropertyOptional({ example: 'Ask about our gluten-free options' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  footerText?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Menu group ID to associate this category with' })
  @IsString()
  @IsOptional()
  menuGroupId?: string;
}
