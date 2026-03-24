import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Enforces that all requests carry the X-Internal-Secret header.
 *
 * In production this ensures only the frontend (which knows the secret)
 * can reach the backend. In development the check is skipped so that
 * curl / Swagger / local tools still work without configuration.
 *
 * The secret is set via the INTERNAL_SECRET env var (must match
 * NEXT_PUBLIC_... is NOT used — this is server-to-server only).
 */
@Injectable()
export class InternalSecretMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InternalSecretMiddleware.name);
  private readonly secret: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.secret = config.get<string>('INTERNAL_SECRET', '');
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    // Skip in development — allows Swagger, curl, and local frontend to work
    if (!this.isProduction) return next();

    // Skip if no secret is configured (misconfiguration warning)
    if (!this.secret) {
      this.logger.warn('INTERNAL_SECRET is not set — internal-secret check disabled in production!');
      return next();
    }

    const provided = req.headers['x-internal-secret'];
    if (provided !== this.secret) {
      this.logger.warn(`Rejected request missing/wrong X-Internal-Secret from ${req.ip}`);
      throw new ForbiddenException('Access denied');
    }

    next();
  }
}
