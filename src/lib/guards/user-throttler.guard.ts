import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  // Only enforce throttling on routes that explicitly use @Throttle() decorator.
  // Routes without @Throttle() pass through without any rate limit.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();

    // @nestjs/throttler v6+ stores metadata with keys like:
    //   "THROTTLER:LIMIT<rule-name>"
    //   "THROTTLER:TTL<rule-name>"
    // So we check if ANY metadata key starts with "THROTTLER:"
    const metadataKeys = Reflect.getMetadataKeys(handler);
    const hasThrottle = metadataKeys.some((key: string) =>
      typeof key === 'string' && key.startsWith('THROTTLER:'),
    );

    // No @Throttle() decorator → skip throttling entirely
    if (!hasThrottle) {
      return true;
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.id;
    if (userId) {
      return `user-${userId}`;
    }
    return req.ip || req.ips?.[0] || 'unknown';
  }

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const isPostCreation = request.url?.includes('/feed/post') && request.method === 'POST';

    const message = isPostCreation
      ? "You're posting too quickly. Please wait a few minutes before posting again."
      : 'Too many requests. Please try again later.';

    throw new ThrottlerException(message);
  }
}