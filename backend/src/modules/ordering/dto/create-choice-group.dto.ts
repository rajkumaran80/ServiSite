import { IsString, IsInt, IsOptional, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChoiceGroupSourceDto {
  @ApiProperty({ enum: ['MENU_GROUP', 'CATEGORY', 'ITEM'] })
  @IsEnum(['MENU_GROUP', 'CATEGORY', 'ITEM'])
  sourceType: 'MENU_GROUP' | 'CATEGORY' | 'ITEM';

  @ApiProperty()
  @IsString()
  sourceId: string;
}

export class CreateChoiceGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minSelection?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSelection?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [ChoiceGroupSourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceGroupSourceDto)
  sources: ChoiceGroupSourceDto[];
}
