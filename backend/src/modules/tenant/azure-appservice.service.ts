import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultAzureCredential } from '@azure/identity';
import { WebSiteManagementClient } from '@azure/arm-appservice';

@Injectable()
export class AzureAppServiceService {
  private readonly logger = new Logger(AzureAppServiceService.name);
  private client: WebSiteManagementClient | null = null;
  private readonly resourceGroup: string;
  private readonly appName: string;
  private readonly subscriptionId: string;

  constructor(private readonly config: ConfigService) {
    this.subscriptionId = config.get<string>('AZURE_SUBSCRIPTION_ID') ?? '';
    this.resourceGroup = config.get<string>('AZURE_RESOURCE_GROUP', 'servisite-rg');
    this.appName = config.get<string>('AZURE_FRONTEND_APP_NAME', 'servisite-prod-frontend');

    if (this.subscriptionId) {
      try {
        this.client = new WebSiteManagementClient(new DefaultAzureCredential(), this.subscriptionId);
      } catch {
        this.logger.warn('Azure App Service client could not be initialised');
      }
    }
  }

  /**
   * Add a custom hostname binding to the frontend App Service.
   * Azure requires this for any non-azurewebsites.net hostname to be accepted.
   */
  async addHostnameBinding(hostname: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`Skipping hostname binding for ${hostname} — Azure client not initialised`);
      return;
    }
    try {
      await this.client.webApps.createOrUpdateHostNameBinding(
        this.resourceGroup,
        this.appName,
        hostname,
        { hostNameType: 'Verified', siteName: this.appName },
      );
      this.logger.log(`Added hostname binding: ${hostname}`);
    } catch (err: any) {
      this.logger.error(`Failed to add hostname binding for ${hostname}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Remove a custom hostname binding when tenant removes their domain.
   */
  async removeHostnameBinding(hostname: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.webApps.deleteHostNameBinding(this.resourceGroup, this.appName, hostname);
      this.logger.log(`Removed hostname binding: ${hostname}`);
    } catch {
      // Non-critical — may already be removed
    }
  }
}
