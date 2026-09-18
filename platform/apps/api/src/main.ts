// ============================================================
// GAMING + SOCIAL PLATFORM — NESTJS API ENTRY POINT
// ============================================================

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve the asset registry files.
  // Files are named {key}-v{version}.{ext}, so every published revision
  // is immutable → browser/APK caches can use long max-age; version bumps
  // produce a brand-new URL which invalidates stale caches automatically.
  const storagePath = configService.get<string>('ASSET_STORAGE_PATH', './storage/assets');
  const assetPublicRoot = configService.get<string>('ASSET_PUBLIC_ROOT', '/assets');
  if (assetPublicRoot) {
    app.useStaticAssets(join(process.cwd(), storagePath), {
      prefix: `/${assetPublicRoot.replace(/^\/+/, '')}`,
      maxAge: '30d',
      immutable: true,
      index: false,
      etag: true,
      lastModified: true,
    });
  }

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Gaming Platform API')
    .setDescription('SaaS Gaming + Social Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req: unknown, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const port = configService.get('PORT', 4002);
  await app.listen(port);
  
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
