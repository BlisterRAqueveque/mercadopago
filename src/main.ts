import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './configurations';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
    cors: true,
  });

  const logger = new Logger('MAIN');

  app.enableCors();
  app.setGlobalPrefix('api');
  await app.listen(envs.PORT);

  logger.log(`Server running on port ${envs.PORT}`);
}
bootstrap();
