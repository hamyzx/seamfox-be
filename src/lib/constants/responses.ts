import { HttpStatus } from '@nestjs/common';

export const statusKeys = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'SERVER_ERROR',
  [HttpStatus.OK]: 'SUCCESS',
  [HttpStatus.CREATED]: 'RESOURCE_CREATED',
};
