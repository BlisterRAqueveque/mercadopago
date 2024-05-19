import { Module } from '@nestjs/common';
import dbConfig from './configurations/config';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments.modules/payments.module';
import { RunnersModule } from './runners.modules/runners.module';

const env = process.env.ENV_DEVELOPMENT;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: env ? `src/configurations/env/${env}.env` : '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dbConfig),
    PaymentsModule,
    RunnersModule,
  ],
  providers: [],
})
export class AppModule {}
