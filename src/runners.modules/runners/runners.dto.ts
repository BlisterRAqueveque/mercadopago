export class RunnerDto {
  id: number;

  runnerNumber: string;

  name: string;

  email: string;

  partnerID: string;

  catValue: string;

  runnerAge: string;

  dni: string;

  runnerBirthDate: string;

  runnerGenre: string;

  status: string;

  status_detail: string;

  tshirtSize: string;

  //! Sacar added 230618
  preference_id: string;

  //! Sacar
  payment_amount: string;

  //! Se crea relación added 230628
  payment_id: string;

  //! Se crea relación added 230628
  merchant_order_id: string;

  paymentStatusCheckUrl: string;

  mailSent: boolean;

  //added 230709
  identification_number: string;

  //added 230816
  discountText: string;

  createdAt: Date;

  updatedAt: Date;
}
