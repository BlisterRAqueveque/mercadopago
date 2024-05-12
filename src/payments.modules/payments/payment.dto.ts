import { OrdersDto } from '../order/order.dto';
import { PayersDto } from '../payer/payer.dto';
import { CardDto } from 'src/payments.modules/card/card.dto';

export class PaymentsDto {
  payment_id?: string;
  collector_id?: number;
  currency_id?: string;
  date_approved?: Date;
  date_created?: Date;
  description?: string;
  id?: number;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;

  order?: OrdersDto;

  payer?: PayersDto;

  card?: CardDto;

  payer_id: number;

  item_description: string;

  item_title: string;
}
