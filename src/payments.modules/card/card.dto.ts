import { PaymentsDto } from 'src/payments.modules/payments/payment.dto';

export class CardDto {
  card_id?: string;
  id?: string;
  first_six_digits?: string;
  last_four_digits?: string;
  expiration_month?: number;
  expiration_year?: number;
  date_created?: string;
  date_last_updated?: string;

  payment?: PaymentsDto[];
}
