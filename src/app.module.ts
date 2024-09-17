import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig, mConfig } from './configurations';
import { PaymentsModule } from './payments.modules/payments.module';
import { RunnersModule } from './runners.modules/runners.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig),
    MailerModule.forRoot(mConfig),
    PaymentsModule,
    RunnersModule,
  ],
  providers: [],
})
export class AppModule {}
