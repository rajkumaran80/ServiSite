import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: Record<string, any>;
  success: boolean;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((result) => {
        // If the result already has data/success shape, pass it through
        if (result && typeof result === 'object' && 'data' in result && 'success' in result) {
          return {
            ...result,
            timestamp: new Date().toISOString(),
          };
        }

        // Wrap in standard response
        return {
          data: result,
          success: true,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
