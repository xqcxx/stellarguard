import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from './config';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const wildcardCors =
    config.corsOrigin === '*' ||
    (Array.isArray(config.corsOrigin) && config.corsOrigin.includes('*'));
  if (config.nodeEnv === 'production' && wildcardCors) {
    Logger.warn(
      "CORS_ORIGIN is '*' in production. Restrict it before exposing this service.",
      'Bootstrap',
    );
  }

  app.enableCors({
    origin: config.corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Header-based API versioning — pass X-API-Version: 1 to target a specific version.
  // Controllers without @Version() respond to all versions (version-neutral).
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
  });

  // Setup Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('StellarGuard API')
    .setDescription(
      'API for StellarGuard treasury management, governance, and vault operations on Stellar blockchain'
    )
    .setVersion('0.1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for write operations (read operations are public)',
      },
      'api-key'
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key as Bearer token (alternative to X-API-Key header)',
      },
      'bearer'
    )
    .addTag('health', 'Health check and system status')
    .addTag('treasury', 'Treasury balance, transactions, and configuration')
    .addTag('governance', 'Governance proposals, votes, and members')
    .addTag('vault', 'Token locks, vesting schedules, and vault statistics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'StellarGuard API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(`StellarGuard API Server running on: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`API Documentation available at: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error(`Error starting server: ${err.message}`, 'Bootstrap');
  process.exit(1);
});
