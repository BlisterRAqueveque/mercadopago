import { Module } from '@nestjs/common';
import dbConfig from './configurations/config';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments.modules/payments.module';
import { RunnersModule } from './runners.modules/runners.module';
import { MailerModule } from '@nestjs-modules/mailer';

const env = process.env.ENV_DEVELOPMENT;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: env ? `src/configurations/env/${env}.env` : '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dbConfig),
    MailerModule.forRoot({
      transport: {
        host: process.env.NODEMAILER_HOST,
        secure: false,
        tls: { rejectUnauthorized: false },
        port: +process.env.NODEMAILER_PORT,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      },
    }),
    PaymentsModule,
    RunnersModule,
  ],
  providers: [],
})
export class AppModule {}
