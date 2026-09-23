import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  private readonly lastWrite = new Map<string, number>();
  private readonly THROTTLE_MS = 60 * 1000;

  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    try {
      const req = context.switchToHttp().getRequest();
      const userId = req?.user?.id;

      if (userId) {
        const now = Date.now();
        const last = this.lastWrite.get(userId) || 0;

        if (now - last > this.THROTTLE_MS) {
          this.lastWrite.set(userId, now);
          this.dataSource
            .getRepository(User)
            .update(userId, { lastActive: new Date() })
            .catch(() => {});
        }
      }
    } catch {}

    return next.handle();
  }
}