import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleToken() {
  try {
    // Find any existing tenant
    const tenant = await prisma.tenant.findFirst();
    
    if (tenant) {
      // Update with sample customDomainApexToken
      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          customDomainApexToken: 'sample_apex_token_' + Date.now()
        }
      });
      
      console.log('Updated tenant with sample customDomainApexToken:', {
        id: updated.id,
        name: updated.name,
        customDomainApexToken: updated.customDomainApexToken
      });
    } else {
      console.log('No tenants found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleToken();
