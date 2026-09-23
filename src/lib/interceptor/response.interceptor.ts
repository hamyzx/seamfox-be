import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, map, throwError } from 'rxjs';
import { IResponse } from '../interfaces/response.interface';
import { statusKeys } from '../constants/responses';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((response: IResponse) => {
        const data = response.data ?? null;
        const message = response.message ?? 'Request was successful.';
        return {
          status: true,
          code: statusKeys[HttpStatus.OK],
          message,
          data,
        };
      }),
      catchError((error) => {
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal Server Error';

        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const response = error.getResponse();
          message =
            typeof response === 'string'
              ? response
              : (response as { message: string }).message || message;
        }

        if (Array.isArray(message)) {
          message = message.length ? message[0] : 'Unknown error occurred';
        }

        const formattedError = {
          status: false,
          code: statusKeys[statusCode as keyof typeof statusKeys] || 'UNKNOWN_ERROR',
          message,
          data: null,
        };

        Logger.error(`Error: ${message}`, error.stack);
        return throwError(() => new HttpException(formattedError, statusCode));
      }),
    );
  }
}
