import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

export interface AuditActor {
  sub: string;
  email: string;
  tenantId: string;
  impersonatedById?: string;
  impersonatedByEmail?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actor: AuditActor,
    action: string,
    opts?: { resource?: string; resourceId?: string; metadata?: Record<string, any> },
  ): Promise<void> {
    if (!actor?.tenantId) return;
    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.sub,
        userEmail: actor.email,
        impersonatedById: actor.impersonatedById ?? null,
        impersonatedByEmail: actor.impersonatedByEmail ?? null,
        action,
        resource: opts?.resource ?? null,
        resourceId: opts?.resourceId ?? null,
        metadata: opts?.metadata ?? {},
      },
    });
  }
}
