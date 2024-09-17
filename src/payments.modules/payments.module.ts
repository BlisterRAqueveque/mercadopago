import { Module } from '@nestjs/common';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsEntity } from './payments/payment.entity';
import { MercadopagoController } from './mercadopago.controller';
import { MercadopagoService } from './mercadopago.service';
import { PaymentsService } from './payments/payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardService } from './card/card.service';
import { OrderService } from './order/order.service';
import { PayerService } from './payer/payer.service';
import { CardController } from './card/card.controller';
import { OrderController } from './order/order.controller';
import { PayerController } from './payer/payer.controller';
import { CardEntity } from './card/card.entity';
import { OrdersEntity } from './order/order.entity';
import { PayersEntity } from './payer/payer.entity';
import { Mailer } from 'src/helper/mailer.service';
import { mercadoPagoConfig, MP_PROVIDER } from 'src/configurations';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CardEntity,
      OrdersEntity,
      PayersEntity,
      PaymentsEntity,
    ]),
  ],
  providers: [
    MercadopagoService,
    {
      provide: MP_PROVIDER,
      useValue: mercadoPagoConfig,
    },
    PaymentsService,
    CardService,
    OrderService,
    PayerService,
    PaymentsService,
    Mailer,
  ],
  controllers: [
    MercadopagoController,
    PaymentsController,
    CardController,
    OrderController,
    PayerController,
    PaymentsController,
  ],
})
export class PaymentsModule {}
