import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { statusKeys } from '../constants/responses';

const getDefaultResponse = (message: string, code: string) => {
  return {
    code,
    message,
    status: false,
    data: null,
  };
};

export const BadRequestHandler = ({
  condition,
  message,
}: {
  condition: boolean;
  message: string;
}) => {
  if (condition) {
    const response = getDefaultResponse(message, statusKeys[HttpStatus.BAD_REQUEST]);
    throw new BadRequestException(response);
  }
};

export const NotFoundHandler = ({
  condition,
  message,
}: {
  condition: boolean;
  message: string;
}) => {
  if (condition) {
    const response = getDefaultResponse(message, statusKeys[HttpStatus.BAD_REQUEST]);
    throw new NotFoundException(response);
  }
};

export const UnAuthorizedHandler = ({
  condition,
  message,
}: {
  condition: boolean;
  message: string;
}) => {
  if (condition) {
    const response = getDefaultResponse(message, statusKeys[HttpStatus.UNAUTHORIZED]);
    throw new UnauthorizedException(response);
  }
};

export const UnProcessableEntityHandler = ({
  condition,
  message,
}: {
  condition: boolean;
  message: string;
}) => {
  if (condition) {
    const response = getDefaultResponse(message, statusKeys[HttpStatus.UNPROCESSABLE_ENTITY]);
    throw new UnprocessableEntityException(response);
  }
};
