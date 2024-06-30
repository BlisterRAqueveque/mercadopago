import {
  Body,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Res,
} from '@nestjs/common';
//! Mercado Pago
import * as mercadopago from 'mercadopago';
import { Options } from 'mercadopago/dist/types';
import { Items } from 'mercadopago/dist/clients/commonTypes';
import {
  BackUrls,
  PreferenceRequest,
  PreferenceResponse,
  RedirectUrls,
} from 'mercadopago/dist/clients/preference/commonTypes';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { PaymentCreateData } from 'mercadopago/dist/clients/payment/create/types';
import { PaymentsService } from './payments/payments.service';
import axios from 'axios';
import { RunnerDto } from 'src/runners.modules/runners/runners.dto';
import { Mailer } from 'src/helper/mailer.service';

@Injectable()
export class MercadopagoService {
  options: Options = {
    //! MP Options
    timeout: 5000, //* Response timeout () => mercadopago API
    // idempotencyKey: '0d5020ed-1af6-469c-ae06-c3bec19954bb',
    // plataformId: '',
    // integratorId: '',
    // corporationId: ''
  };

  configMp = new mercadopago.MercadoPagoConfig({
    //! MP Configurations
    accessToken: this.mercadoPagoConfig.accessToken,
    options: this.options,
  });

  constructor(
    //? Inject the credentials ()=> access_token
    @Inject('MERCADO_PAGO_CONFIG')
    private readonly mercadoPagoConfig: any,
    private paymentService: PaymentsService,
    private readonly mailer: Mailer,
  ) {}

  /**
   * @param res The response of the request
   * @param item Item to pay
   */
  async createPreference(item: Items, runner: RunnerDto, @Res() res) {
    const pref = new mercadopago.Preference(this.configMp); //! Mp Preference

    try {
      const response = await axios.post(
        `https://api.mmrun.hvdevs.com/runners`,
        runner,
      );
      const runnerResponse = response.data;

      const items: Items[] = [
        {
          //! Some random item (test only)
          id: runnerResponse.id,
          title: item.title,
          description: item.description,
          picture_url: '',
          category_id: item.category_id, //! PASO LA CATEGORÍA (ID)
          quantity: +item.quantity,
          currency_id: item.currency_id,
          unit_price: +item.unit_price,
        },
      ];

      const backUrls: BackUrls = {
        success: `${process.env.WEB_URL}`,
        failure: `${process.env.WEB_URL}`,
        pending: `${process.env.WEB_URL}`,
      };

      const redirectUrl: RedirectUrls = {
        success: '',
        failure: '',
        pending: '',
      };

      const preference: PreferenceRequest = {
        items: items,
        purpose: 'wallet_purchase',
        back_urls: backUrls,
        // redirect_urls: redirectUrl,
        // expires: false,
        // expiration_date_from: '',
        // expiration_date_to: ''
        auto_return: 'approved',
        notification_url: `${process.env.API_URL}api/mercadopago/notification`,
      };

      //* Create the preference and sends to the MP server
      pref
        .create({
          body: preference,
          requestOptions: this.options,
        })
        .then((response: PreferenceResponse) => {
          res.status(HttpStatus.OK).json(response); //! Send only init_point
        })
        .catch((e: any) => {
          console.error(e);
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(e);
        });
    } catch (error) {
      //* Caso que falle, se envía el error
      console.error(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
    }
  }

  /**
   * @description this function communicates with MP servers
   * @param body payment information
   * @returns status of the request to MP servers
   */
  async notification(@Body() body) {
    try {
      //* Obtenemos el pago de MercadoPago
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${body.id}?access_token=${this.configMp.accessToken}`,
      );

      let payment: PaymentResponse = response.data;

      let mail;
      let data;
      try {
        const responseRunner = await axios.get(
          `https://api.mmrun.hvdevs.com/runners/${payment.additional_info.items[0].id}`,
        );
        console.error(responseRunner);
        /** Edita la información del usuario, con el pago y demás */
        responseRunner.data.status = payment.status;
        responseRunner.data.status_detail = payment.status_detail;
        responseRunner.data.payment_amount =
          payment.additional_info.items[0].unit_price;
        responseRunner.data.payment_id = payment.id;
        responseRunner.data.mailSent = true;

        mail = responseRunner.data.email;

        //? asignamos valores a la variable data de los datos que recogemos desde la respuesta de la api de corredores
        data = {
          runnerName: responseRunner.data.name,
          runnerId: responseRunner.data.id,
          raceName: responseRunner.data.catValue,
          raceCost: payment.additional_info.items[0].unit_price,
          tshirtSize: responseRunner.data.tshirtSize,
          paymentNumber: payment.id,
          paymentStatus: payment.status_detail,
        };

        //* Dejamos asíncrono para que no interrumpa el flujo de la app
        this.mailer.sendMail(
          [mail],
          payment.status === 'approved' ? true : false,
          data,
        );

        //? Le asignamos que se envió el mail
        responseRunner.data.mailSent = true;

        const editRunner = await axios.put(
          `https://api.mmrun.hvdevs.com/runners/${payment.additional_info.items[0].id}`,
          responseRunner.data,
        );
      } catch (error) {
        console.error(error);
      }

      if (payment.status === 'approved') {
        const result = await this.paymentService.insert({ ...payment });

        // Mandar mail
        //? pasamos la variable data
        this.mailer.sendMail([mail], true, data);
        console.error(result);
        return response.status;
      } else {
        // Mandar mail de error
        this.mailer.sendMail([mail], false, data);
        throw new HttpException('Payment error', HttpStatus.BAD_REQUEST);
      }
    } catch (e: any) {
      //! Handle errors
      if (e.response.status) return e.response.status;
      else return e.status;
    }
  }

  //! --------------------------------------------------------------------------------------->
  //* Deprecated
  /**@deprecated Not for use */
  async cardPaymentDone(body: any) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        // 'X-Idempotency-Key': '0d5020ed-1af6-469c-ae06-c3bec19954bb',
        Authorization: `Bearer ${this.mercadoPagoConfig.accessToken}`,
      };

      const url = 'https://api.mercadopago.com/v1/payments';

      const payment = new mercadopago.Payment(this.mercadoPagoConfig);
      const p: PaymentCreateData = body;
      //* Get the item from the client
      const items: Items[] = [];
      items.push({ ...body.item, currency_id: undefined });
      const data = await payment.create({
        // body
        body: {
          additional_info: {
            items: items,
          },
          token: body.token,
          issuer_id: body.issuer_id,
          payment_method_id: body.payment_method_id,
          transaction_amount: body.transaction_amount,
          installments: body.installments,
          payer: {
            email: body.payer.email,
            identification: {
              type: body.payer.identification.type,
              number: body.payer.identification.number,
            },
          },
          notification_url: `${process.env.API_URL}api/mercadopago/card-notification`,
          statement_descriptor: 'Estacionamiento medido San Martín',
        },
        // requestOptions: {
        //     idempotencyKey: '0d5020ed-1af6-469c-ae06-c3bec19954bb'
        // }
      });
      if (data.status === 'approved') {
        //! Insert payment into database
        const item = body.item;
        const ids = item.id.split('@');
        //const user_id = ids[0] ? ids[0] : null  //! ID USER

        const patente = ids[1] ? ids[1] : null; //! ID PATENTE

        const result = await this.paymentService.insert(data);

        try {
          return {
            ok: true,
            result: { ...data },
            msg: 'approved',
          };
        } catch (error) {
          console.error(error);
          return { ok: false, msg: 'rejected' };
        }
      } else if (data.status === 'rejected') {
        console.error('El pago no fue aprobado.');
        return { ok: false, msg: 'rejected' };
      }
    } catch (e: any) {
      console.error(e);
      throw new HttpException(e.message, e.status);
    }
  }

  /**@deprecated Not for use */
  async cardNotification(body: any) {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${body.id}?access_token=${this.configMp.accessToken}`,
    );
    let payment: PaymentResponse = response.data;
  }

  //! USER'S SECTION --------------------------------------------------------------------->
  /**
   * @param res The response of the request
   * @param item Item to pay
   */
  /**@deprecated Not for use */
  async userPaymentPreference(item: Items, @Res() res) {
    const pref = new mercadopago.Preference(this.configMp); //! Mp Preference

    //TODO Preference constructor () => {
    // TODO Categoria mandar id de tipo tarifa
    const items: Items[] = [
      {
        //! Some random item (test only)
        id: item.id,
        title: item.title,
        description: item.description,
        picture_url: '',
        category_id: item.category_id, //! PASO LA CATEGORIA (ID)
        quantity: item.quantity,
        currency_id: item.currency_id,
        unit_price: item.unit_price,
      },
    ];

    const backUrls: BackUrls = {
      success: `${process.env.WEB_URL}account/payment-user`,
      failure: `${process.env.WEB_URL}account/payment-user`,
      pending: `${process.env.WEB_URL}account/payment-user`,
    };

    const redirectUrl: RedirectUrls = {
      success: '',
      failure: '',
      pending: '',
    };

    const preference: PreferenceRequest = {
      items: items,
      purpose: 'wallet_purchase',
      back_urls: backUrls,
      // redirect_urls: redirectUrl,
      // expires: false,
      // expiration_date_from: '',
      // expiration_date_to: ''
      auto_return: 'approved',
      notification_url: `${process.env.API_URL}api/mercadopago/user-notification`,
    };

    //* Create the preference and sends to the MP server
    pref
      .create({
        body: preference,
        requestOptions: this.options,
      })
      .then((response: PreferenceResponse) => {
        res.status(HttpStatus.OK).json(response); //! Send only init_point
      })
      .catch((e: any) => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(e);
      });
  }

  /**
   * @description this function communicates with MP servers, add to the user the payment quantity
   * @param body payment information
   * @returns status of the request to MP servers
   */
  /**@deprecated Not for use */
  async parkingUserPaymentDone(body: any) {
    try {
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${body.id}?access_token=${this.configMp.accessToken}`,
      );
      let payment: PaymentResponse = response.data;
      if (payment.status === 'approved') {
        let category = payment.additional_info.items[0].category_id;
        //! Insert payment into database
        const item = payment.additional_info.items;
        const ids = item[0].id.split('@');
        try {
          const paymentResult = await this.paymentService.insert(payment);
          if (paymentResult) return response.status;
          else {
            //TODO REFUND in case of fail
          }
        } catch (error) {
          //TODO REFUND in case of fail
          console.error(error);
        }

        return response.status;
      } else {
        throw new HttpException('Payment error', HttpStatus.BAD_REQUEST);
      }
    } catch (e: any) {
      //! Handle errors
      if (e.response.status) return e.response.status;
      else return e.status;
    }
  }

  /**@deprecated Not for use */
  async cardUserPaymentDone(body: any) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        // 'X-Idempotency-Key': '0d5020ed-1af6-469c-ae06-c3bec19954bb',
        Authorization: `Bearer ${this.mercadoPagoConfig.accessToken}`,
      };

      const url = 'https://api.mercadopago.com/v1/payments';

      const payment = new mercadopago.Payment(this.mercadoPagoConfig);

      const data = await payment.create({
        // body
        body: {
          token: body.token,
          issuer_id: body.issuer_id,
          payment_method_id: body.payment_method_id,
          transaction_amount: body.transaction_amount,
          installments: body.installments,
          //description: 'Recarga de crédito',
          //external_reference: 'ESANMA-2024',
          //notification_url: 'https://782d9jpr-3000.brs.devtunnels.ms/api/mercadopago/parking-notification',
          payer: {
            email: body.payer.email,
            identification: {
              type: body.payer.identification.type,
              number: body.payer.identification.number,
            },
          },
        },
        // requestOptions: {
        //     idempotencyKey: '0d5020ed-1af6-469c-ae06-c3bec19954bb'
        // }
      });

      if (data.status === 'approved') {
        let category = body.item.category_id;
        //! Insert payment into database
        const item = body.item;
        const ids = item.id.split('@');
        const user_id = ids[0] ? ids[0] : null; //! ID USER

        try {
          const paymentResult = await this.paymentService.insert(data);

          return { ok: true, msg: 'approved' };
        } catch (error) {
          console.error(error);
          return { ok: false, msg: 'rejected' };
        }
      } else if (data.status === 'rejected') {
        console.error('El pago no fue aprobado.');
        return { ok: false, msg: 'rejected' };
      }
    } catch (e: any) {
      console.error(e);
      throw new HttpException(e.message, e.status);
    }
  }
  //* Deprecated
  //! --------------------------------------------------------------------------------------->
}
