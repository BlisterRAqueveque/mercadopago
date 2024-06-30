import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { Repository } from 'typeorm';
import { OrdersDto } from '../order/order.dto';
import { PayersDto } from '../payer/payer.dto';
import { CardDto } from 'src/payments.modules/card/card.dto';
import { PaymentsDto } from './payment.dto';
import { PaymentsEntity } from './payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentsEntity)
    private paymentRepository: Repository<PaymentsDto>,
  ) {}

  async insert(payment: PaymentResponse): Promise<PaymentsDto> {
    try {
      //! The payment has only an unique id
      const entity = await this.paymentRepository.findOne({
        where: { id: payment.id },
      });
      if (entity) throw new HttpException('Already exist', HttpStatus.CONFLICT);

      let payer = new PayersDto();
      payer = payment.payer;

      let order = new OrdersDto();
      order = payment.order;

      let card = new CardDto();
      card = payment.card;

      const item = payment.additional_info
        ? payment.additional_info.items[0]
        : undefined;

      let new_payment = new PaymentsDto();
      new_payment = {
        ...payment,
        date_approved: new Date(payment.date_approved),
        date_created: new Date(payment.date_created),
        payer: payer,
        order: order,
        card: card ? card : null,
        payer_id: item ? +item.id : 0,
        item_description: item ? item.description : null,
        item_title: item ? item.title : null,
      };

      return await this.paymentRepository.save(new_payment);
    } catch (e: any) {
      console.error(e);
      throw new HttpException(`${e.message}`, e.status);
    }
  }

  /**@description A traves del collection_id que devuelve MP, podemos consultar el estado desde la base de datos */
  async getUserPayment(id: number): Promise<PaymentsDto> {
    try {
      const result = await this.paymentRepository.findOne({
        where: { id: id },
      });
      return result;
    } catch (e: any) {
      throw new HttpException(e.message, e.status);
    }
  }

  async getUserPaymentStatusByCollectorId(
    collector_id: number,
  ): Promise<string> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { collector_id: collector_id },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      return payment.status;
    } catch (e: any) {
      throw new HttpException(e.message, e.status);
    }
  }
}
