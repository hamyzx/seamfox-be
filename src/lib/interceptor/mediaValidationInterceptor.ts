import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { UnProcessableEntityHandler } from '../helpers/responseHandlers';

interface IFileInterceptorUpload {
  key: string;
  fileType?: string[];
  maxSize: number;
}
@Injectable()
export class UploadFileValidationInterceptor implements NestInterceptor {
  private readonly options: IFileInterceptorUpload;
  constructor(@Inject('OPTIONS') options: IFileInterceptorUpload) {
    this.options = options;
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    let file = request[this.options.key];

    const isMultipleFiles = Array.isArray(file);
    if (!isMultipleFiles) {
      // converting in array so that can loop through it same as for multiple ones
      file = [file];
    }

    file.forEach((f) => {
      UnProcessableEntityHandler({
        condition: !f,
        message: 'File is required',
      });

      UnProcessableEntityHandler({
        condition: !!this.options.fileType && !this.options.fileType.includes(f.mimetype),
        message: 'File type not allowed',
      });

      UnProcessableEntityHandler({
        condition: f.size > this.options.maxSize,
        message: 'File size exceed',
      });
    });

    return next.handle();
  }
}
