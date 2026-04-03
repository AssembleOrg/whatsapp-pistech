import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

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

  // Swagger - protected by password in production
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pistech WhatsApp API')
    .setDescription('WhatsApp messaging API for Pistech apps')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  if (process.env.NODE_ENV === 'production') {
    const docsPassword = process.env.API_KEY;
    const swaggerAuth = (req: Request, res: Response, next: NextFunction) => {
      if (req.query['password'] === docsPassword) {
        return next();
      }
      res.status(401).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Docs - Login</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#1a1a1a;border-radius:12px;padding:2rem;width:340px}h1{font-size:1.2rem;margin-bottom:1rem;text-align:center}input{width:100%;padding:.7rem;border:1px solid #333;border-radius:8px;background:#0a0a0a;color:#e0e0e0;font-size:1rem;margin-bottom:1rem}button{width:100%;padding:.7rem;border:none;border-radius:8px;background:#25D366;color:#000;font-weight:600;cursor:pointer}button:hover{background:#1ebe57}</style></head>
<body><div class="card"><h1>API Docs</h1><form method="GET"><input type="password" name="password" placeholder="Password" required autofocus/><button type="submit">Ingresar</button></form></div></body></html>`);
    };
    app.use('/docs', swaggerAuth);
  }

  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
