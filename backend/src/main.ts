import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { RequestContext } from './common/types/request-context.type';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });

  // Capture raw body (useful for payment webhooks like Razorpay)
  app.use(
    json({
      verify: (req: RequestContext, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      verify: (req: RequestContext, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  // Swagger Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OmniPax API')
    .setDescription('OmniPax Ticket Booking Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document);

  // Start server
  const port = Number(configService.getOrThrow<string>('PORT'));
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 OmniPax Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger Docs available at: http://localhost:${port}/docs`);
}

bootstrap();
