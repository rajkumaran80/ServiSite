import {
  Controller,
  Get,
  Post,
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
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CloudflareService, CustomHostname } from './cloudflare.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class AddCustomHostnameDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  hostname: string;
}

class DeleteCustomHostnameDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  hostname: string;
}

class DomainStatusResponse {
  @ApiProperty()
  hostname: string;

  @ApiProperty({ enum: ['pending', 'active', 'deleted'] })
  status: string;

  @ApiPropertyOptional()
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };

  @ApiPropertyOptional()
  ssl?: {
    status: string;
    validation_records?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  };
}

class DisconnectDomainDto {
  @ApiProperty({ example: 'coffee.co.uk' })
  @IsString()
  hostname: string;
}

@ApiTags('Cloudflare')
@Controller('cloudflare')
export class CloudflareController {
  constructor(private readonly cloudflareService: CloudflareService) {}

  @Post('custom-hostnames')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a custom hostname for a tenant' })
  async addCustomHostname(
    @Tenant('id') tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: AddCustomHostnameDto,
  ): Promise<DomainStatusResponse> {
    try {
      const hostname = await this.cloudflareService.addCustomHostname(dto.hostname);
      
      // Update tenant with custom domain info
      // This would be implemented in a tenant service method
      
      return {
        hostname: hostname.hostname,
        status: hostname.status,
        ownership_verification: hostname.ownership_verification,
        ssl: hostname.ssl,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to add custom hostname: ${error.message}`);
    }
  }

  @Get('custom-hostnames')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all custom hostnames for the zone' })
  async getCustomHostnames(): Promise<DomainStatusResponse[]> {
    try {
      const hostnames = await this.cloudflareService.getCustomHostnames();
      
      return hostnames.map(hostname => ({
        hostname: hostname.hostname,
        status: hostname.status,
        ownership_verification: hostname.ownership_verification,
        ssl: hostname.ssl,
      }));
    } catch (error) {
      throw new BadRequestException(`Failed to get custom hostnames: ${error.message}`);
    }
  }

  @Get('custom-hostnames/:hostname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get status of a specific custom hostname' })
  async getCustomHostnameStatus(
    @Param('hostname') hostname: string,
  ): Promise<DomainStatusResponse> {
    try {
      const customHostname = await this.cloudflareService.getCustomHostname(hostname);
      
      if (!customHostname) {
        throw new NotFoundException('Custom hostname not found');
      }

      return {
        hostname: customHostname.hostname,
        status: customHostname.status,
        ownership_verification: customHostname.ownership_verification,
        ssl: customHostname.ssl,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get custom hostname status: ${error.message}`);
    }
  }

  @Get('custom-hostnames/:hostname/verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ownership verification records for a hostname' })
  async getOwnershipVerification(
    @Param('hostname') hostname: string,
  ): Promise<any> {
    try {
      return await this.cloudflareService.getHostnameOwnershipVerification(hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get ownership verification: ${error.message}`);
    }
  }

  @Get('custom-hostnames/:hostname/ssl-validation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SSL validation records for a hostname' })
  async getSSLValidation(
    @Param('hostname') hostname: string,
  ): Promise<any> {
    try {
      return await this.cloudflareService.getHostnameSSLValidation(hostname);
    } catch (error) {
      throw new BadRequestException(`Failed to get SSL validation: ${error.message}`);
    }
  }

  @Delete('custom-hostnames')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a custom hostname' })
  async deleteCustomHostname(
    @Tenant('id') tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: DeleteCustomHostnameDto,
  ): Promise<{ message: string }> {
    try {
      await this.cloudflareService.deleteCustomHostnameByDomain(dto.hostname);
      
      // Update tenant to remove custom domain info
      // This would be implemented in a tenant service method
      
      return { message: 'Custom hostname deleted successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to delete custom hostname: ${error.message}`);
    }
  }

  @Delete('custom-hostnames/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all custom hostnames (disconnect all domains)' })
  async clearAllCustomHostnames(
    @Tenant('id') tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string; deletedCount: number }> {
    try {
      const hostnames = await this.cloudflareService.getCustomHostnames();
      const deletedCount = hostnames.length;
      
      await this.cloudflareService.clearAllCustomHostnames();
      
      // Update all tenants to remove custom domain info
      // This would be implemented in a tenant service method
      
      return { 
        message: 'All custom hostnames cleared successfully',
        deletedCount 
      };
    } catch (error) {
      throw new BadRequestException(`Failed to clear custom hostnames: ${error.message}`);
    }
  }

  @Get('zone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Cloudflare zone information' })
  async getZone(): Promise<any> {
    try {
      return await this.cloudflareService.getZone();
    } catch (error) {
      throw new BadRequestException(`Failed to get zone info: ${error.message}`);
    }
  }

  @Get('origin-settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get origin fallback settings' })
  async getOriginSettings(): Promise<any> {
    try {
      return await this.cloudflareService.getOriginFallbackSettings();
    } catch (error) {
      throw new BadRequestException(`Failed to get origin settings: ${error.message}`);
    }
  }
}
