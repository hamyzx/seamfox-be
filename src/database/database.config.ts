import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const databaseConfigFactory = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const entities = [path.join(__dirname, '../**/entities/*.entity{.ts,.js}')];
  
  const dbHost = configService.get<string>('DB_HOST') || '';
  const isRDS = dbHost.includes('amazonaws.com');
  
  return {
    type: 'postgres',
    host: dbHost,
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    ssl: isRDS ? {
      rejectUnauthorized: false,
    } : false,
    entities,
    synchronize: false,
    logging: false,
    // logging: ['query', 'error'],
  };
};