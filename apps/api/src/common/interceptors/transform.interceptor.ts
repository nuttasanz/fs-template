import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { BaseResponse } from '@repo/schemas';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { PaginatedResponse } from '../responses/paginated.response';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, BaseResponse<T> | undefined> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponse<T> | undefined> {
    return next.handle().pipe(
      map((data) => {
        // 204 No Content — void handlers return undefined; pass through untouched.
        if (data === null || data === undefined) return data as undefined;

        // Raw streams / file downloads — pass through untouched to prevent corruption.
        if (data instanceof StreamableFile) return data as unknown as BaseResponse<T>;

        // Already-formatted response — do not double-wrap.
        if (typeof data === 'object' && 'success' in (data as object))
          return data as unknown as BaseResponse<T>;

        // Terminus health-check responses ({ status, info, error, details }) must
        // pass through unwrapped so their HTTP status (200 / 503) is preserved.
        if (
          typeof data === 'object' &&
          'status' in (data as object) &&
          'details' in (data as object)
        )
          return data as unknown as BaseResponse<T>;

        const message =
          this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
            context.getHandler(),
            context.getClass(),
          ]) ?? 'OK';

        if (data instanceof PaginatedResponse) {
          return { success: true as const, message, result: data.data, meta: data.meta } as unknown as BaseResponse<T>;
        }

        return { success: true as const, message, data };
      }),
    );
  }
}
