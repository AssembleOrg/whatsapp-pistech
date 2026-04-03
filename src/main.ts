import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS - restrict to allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS ?? '*';
  if (allowedOrigins === '*') {
    app.enableCors();
  } else {
    const origins = allowedOrigins.split(',').map((o) => o.trim());
    app.enableCors({
      origin: origins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
    });
  }

  // Swagger - only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pistech WhatsApp API')
      .setDescription('WhatsApp messaging API for Pistech apps')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
