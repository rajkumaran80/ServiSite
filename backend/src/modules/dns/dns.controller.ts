import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DnsService } from './dns.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateDnsRecordDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  hostname: string;

  @ApiProperty({ example: 'TXT' })
  @IsString()
  recordType: string;

  @ApiProperty({ example: '_dmarc.coffee.co.uk' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'v=DMARC1; p=quarantine' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 300 })
  @IsNumber()
  @IsOptional()
  ttl?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: 'cloudflare' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isOwnershipVerification?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isSSLValidation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isSystemManaged?: boolean;
}

class UpdateDnsRecordDto {
  @ApiPropertyOptional({ example: 'TXT' })
  @IsString()
  @IsOptional()
  recordType?: string;

  @ApiPropertyOptional({ example: '_dmarc.coffee.co.uk' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'v=DMARC1; p=quarantine' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ example: 300 })
  @IsNumber()
  @IsOptional()
  ttl?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ enum: ['pending', 'active', 'error', 'deleted'] })
  @IsString()
  @IsOptional()
  status?: string;
}

class CreateDnsZoneDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  zoneName: string;

  @ApiPropertyOptional({ example: 'cloudflare' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  providerZoneId?: string;

  @ApiPropertyOptional({ example: 'https://myapp.azurewebsites.net' })
  @IsString()
  @IsOptional()
  originUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  nameservers?: string[];
}

class SyncDnsDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  hostname: string;
}

@ApiTags('DNS')
@Controller('dns')
export class DnsController {
  constructor(private readonly dnsService: DnsService) {}

  @Get('zone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DNS zone for current tenant' })
  async getDnsZone(@Tenant('id') tenantId: string): Promise<any> {
    try {
      return await this.dnsService.getDnsZone(tenantId);
    } catch (error) {
      throw new BadRequestException(`Failed to get DNS zone: ${error.message}`);
    }
  }

  @Post('zone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create DNS zone for tenant' })
  async createDnsZone(
    @Tenant('id') tenantId: string,
    @Body() dto: CreateDnsZoneDto,
  ): Promise<any> {
    try {
      return await this.dnsService.createDnsZone(tenantId, dto);
    } catch (error) {
      throw new BadRequestException(`Failed to create DNS zone: ${error.message}`);
    }
  }

  @Put('zone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update DNS zone for tenant' })
  async updateDnsZone(
    @Tenant('id') tenantId: string,
    @Body() dto: Partial<CreateDnsZoneDto>,
  ): Promise<any> {
    try {
      return await this.dnsService.updateDnsZone(tenantId, dto);
    } catch (error) {
      throw new BadRequestException(`Failed to update DNS zone: ${error.message}`);
    }
  }

  @Get('records')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DNS records for current tenant' })
  async getDnsRecords(
    @Tenant('id') tenantId: string,
    @Param('hostname') hostname?: string,
  ): Promise<any[]> {
    try {
      return await this.dnsService.getDnsRecords(tenantId, hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get DNS records: ${error.message}`);
    }
  }

  @Get('records/:hostname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DNS records for specific hostname' })
  async getDnsRecordsByHostname(@Param('hostname') hostname: string): Promise<any[]> {
    try {
      return await this.dnsService.getDnsRecordsByHostname(hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get DNS records: ${error.message}`);
    }
  }

  @Post('records')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create DNS record' })
  async createDnsRecord(
    @Tenant('id') tenantId: string,
    @Body() dto: CreateDnsRecordDto,
  ): Promise<any> {
    try {
      return await this.dnsService.createDnsRecord(tenantId, dto);
    } catch (error) {
      throw new BadRequestException(`Failed to create DNS record: ${error.message}`);
    }
  }

  @Put('records/:recordId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update DNS record' })
  async updateDnsRecord(
    @Param('recordId') recordId: string,
    @Body() dto: UpdateDnsRecordDto,
  ): Promise<any> {
    try {
      return await this.dnsService.updateDnsRecord(recordId, dto);
    } catch (error) {
      throw new BadRequestException(`Failed to update DNS record: ${error.message}`);
    }
  }

  @Delete('records/:recordId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete DNS record' })
  async deleteDnsRecord(@Param('recordId') recordId: string): Promise<{ message: string }> {
    try {
      await this.dnsService.deleteDnsRecord(recordId);
      return { message: 'DNS record deleted successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to delete DNS record: ${error.message}`);
    }
  }

  @Delete('records/hostname/:hostname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all DNS records for hostname' })
  async deleteDnsRecordsByHostname(@Param('hostname') hostname: string): Promise<{ message: string; deletedCount: number }> {
    try {
      const deletedCount = await this.dnsService.deleteDnsRecordsByHostname(hostname);
      return { 
        message: 'DNS records deleted successfully',
        deletedCount 
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete DNS records: ${error.message}`);
    }
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync DNS records from Cloudflare to database' })
  async syncFromCloudflare(@Body() dto: SyncDnsDto): Promise<{ message: string }> {
    try {
      await this.dnsService.syncFromCloudflare(dto.hostname);
      return { message: 'DNS records synced successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to sync DNS records: ${error.message}`);
    }
  }

  @Get('verification/:hostname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification records from database' })
  async getVerificationRecords(@Param('hostname') hostname: string): Promise<any> {
    try {
      return await this.dnsService.getVerificationRecords(hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get verification records: ${error.message}`);
    }
  }

  @Get('status/:hostname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain status from database (fallback to Cloudflare)' })
  async getDomainStatus(@Param('hostname') hostname: string): Promise<any> {
    try {
      return await this.dnsService.getDomainStatus(hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get domain status: ${error.message}`);
    }
  }
}
