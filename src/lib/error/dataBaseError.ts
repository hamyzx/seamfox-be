// db-error.helper.ts
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export function handleDBError(error: any): never {
  const code = error?.code || error?.driverError?.code;

  switch (code) {
    case '23505': // unique_violation
      throw new ConflictException(
        `Duplicate value violates unique constraint, ${error?.driverError?.detail}`,
      );

    case '23502': // not_null_violation
      throw new BadRequestException(
        `Missing required field (NOT NULL violation), ${error?.driverError?.column}`,
      );

    case '23503': // foreign_key_violation
      throw new BadRequestException('Invalid reference (foreign key violation)');

    case '23514': // check_violation
      throw new BadRequestException('Check constraint violated');

    case '22001': // string_data_right_truncation
      throw new BadRequestException('Value too long for column');

    case '22P02': // invalid_text_representation
      throw new BadRequestException('Invalid input syntax (e.g., UUID parse error)');

    case '42703': // undefined_column
      throw new BadRequestException('Invalid column specified');

    case '42P01': // undefined_table
      throw new NotFoundException('Table does not exist');

    default:
      throw error;
  }
}
