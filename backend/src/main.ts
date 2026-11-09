import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ensureUploadDir, uploadDir } from './learning/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Sermon PDFs are served from /files/<uuid>.pdf (unguessable names; admin uploads only).
  ensureUploadDir();
  app.useStaticAssets(uploadDir(), {
    prefix: '/files',
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
      : true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Light Youth API running on http://localhost:${port}/api`);
}
bootstrap();
