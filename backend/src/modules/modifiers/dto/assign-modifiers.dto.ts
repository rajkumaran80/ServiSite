import { IsArray, IsString, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ModifierGroupAssignment {
  @ApiProperty()
  @IsString()
  modifierGroupId: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class AssignModifiersDto {
  @ApiProperty({ type: [ModifierGroupAssignment] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierGroupAssignment)
  groups: ModifierGroupAssignment[];
}
