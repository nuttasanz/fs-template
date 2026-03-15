import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { BaseResponse } from '@repo/schemas';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

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

        // Already-formatted response — do not double-wrap.
        if (typeof data === 'object' && 'success' in (data as object))
          return data as unknown as BaseResponse<T>;

        const message =
          this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
            context.getHandler(),
            context.getClass(),
          ]) ?? 'OK';

        return { success: true as const, message, data };
      }),
    );
  }
}
