import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure CORS
  app.enableCors({
    origin: '*', // For development, allow all. In production, this should be restricted.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(`StellarGuard API Server running on: http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error(`Error starting server: ${err.message}`, 'Bootstrap');
  process.exit(1);
});
