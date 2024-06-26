import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
    cors: true,
  });
  app.enableCors();
  app.setGlobalPrefix('api');
  await app.listen(3088);
}
bootstrap();
