import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './lib/interceptor/response.interceptor';
import * as express from 'express';
import * as qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const port = configService.get<number>('PORT') ?? 5000;

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        configService.get<string>('FRONTEND_LOCAL'),
        configService.get<string>('FRONTEND_STAGING'),
        configService.get<string>('FRONTEND_LIVE'),
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.setGlobalPrefix('api');

  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app
    .getHttpAdapter()
    .getInstance()
    .set('query parser', (str) => qs.parse(str));

  await app.listen(port);

  Logger.log(`Server running in ${nodeEnv} mode`);
  Logger.log(`Listening on port ${port}`);
}

bootstrap();