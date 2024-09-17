import {
  Body,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
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
import { envs, MP_PROVIDER } from 'src/configurations';

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
    @Inject(MP_PROVIDER)
    private readonly mercadoPagoConfig: any,
    private paymentService: PaymentsService,
    private readonly mailer: Mailer,
  ) {}

  logger = new Logger('MERCADO PAGO SERVICE');

  /**
   * @param res The response of the request
   * @param item Item to pay
   */
  async createPreference(item: Items, runner: RunnerDto, @Res() res) {
    const pref = new mercadopago.Preference(this.configMp); //! Mp Preference

    try {
      const response = await axios.post(
        `${envs.MMRUN_API}runners`,
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
        success: `${envs.WEB_URL}`,
        failure: `${envs.WEB_URL}`,
        pending: `${envs.WEB_URL}`,
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
        notification_url: `${envs.API_URL}api/mercadopago/notification`,
      };

      //? Added 20240712: for Caminata circuit no charges should be applied

      //? check if description is Caminata
      if (item.description === 'Caminata') {
        //? create an object with runner data for mail purposes
        let datos = {
          runnerName: runnerResponse.name,
          runnerId: runnerResponse.id,
          raceName: runnerResponse.catValue,
          raceCost: '$ 0.00', //? no cost
          tshirtSize: runnerResponse.tshirtSize,
          paymentNumber: 'No hubieron cargos', //? no cost
          paymentStatus: 'No hubieron cargos', //? no cost
        };

        //? send the email with the previous runner data for mail purpose
        await this.mailer.sendMail([runnerResponse.email], true, datos);

        //? edit the statuses of mail sent and payment status for the runner
        /**
         * @description
         * El primer estado del mail debe ser false.
         * Luego de recibir la respuesta de Mercado Pago, se envía el mail.
         * Enviado el mail, se cambia el estado del usuario
         */
        runnerResponse.mailSent = false;
        runnerResponse.status = 'approved';

        //? put the changes on db
        const editRunner = await axios.put(
          `${envs.MMRUN_API}runners/${runnerResponse.id}`,
          runnerResponse,
        );

        this.logger.log('Edit runner: ', JSON.stringify(editRunner));

        //? create the url params and define the success url manually
        let u = '?status=approved';
        let r = `&runner_id=${runnerResponse.id}`;
        let init_point = 'https://mmrun.com.ar/registro/' + u + r;

        //? pass the defined url as an object
        let data = {
          init_point,
        };
        //? response with a status OK, and pass the url object in a json response
        res.status(HttpStatus.OK).json(data);
      }

      //? the previous logic now is the else condition if circuit is not Caminata
      else {
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
      }
    } catch (error) {
      //* Caso que falle, se envía el error
      this.logger.error('Error in preference: ', JSON.stringify(error));
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
      //? URL de consulta para obtener el pago desde la API de Mercado Pago
      const url = `https://api.mercadopago.com/v1/payments/${body.id}?access_token=${this.configMp.accessToken}`;
      //* Obtenemos el pago de MercadoPago
      const response = await axios.get(url);

      const payment: PaymentResponse = response.data;

      try {
        await this.getRunnerInfo(payment);
      } catch (error) {
        this.logger.error('Error in notification', JSON.stringify(error));
      }

      if (payment.status === 'approved') {
        const result = await this.paymentService.insert({ ...payment });
        this.logger.log('Status approved: ', JSON.stringify(result));
        return response.status;
      } else {
        throw new HttpException('Payment error', HttpStatus.BAD_REQUEST);
      }
    } catch (e: any) {
      this.logger.error('Error in notification: ', JSON.stringify(e));
      //! Handle errors
      if (e.response.status) return e.response.status;
      else return e.status;
    }
  }

  /**
   * @description
   * Obtenemos la información del usuario, completamos los campos restantes, que son referentes al pago.
   * Corroboramos que no se haya enviado con anterioridad el correo, para no enviar información redundante.
   */
  async getRunnerInfo(payment) {
    try {
      //? Obtenemos el item, y lo guardamos en una variable en el espacio de memoria
      const item = payment.additional_info
        ? payment.additional_info.items[0]
        : undefined;

      if (item) {
        //? URL para la consulta del corredor
        const url = `${envs.MMRUN_API}runners/${item.id}`;
        //? Obtenemos el corredor:
        const runner = (await axios.get(url)).data as RunnerDto;

        if (runner ? !runner.mailSent : false) {
          //? Edita la información del usuario, con el pago y demás
          runner.status = payment.status;
          runner.status_detail = payment.status_detail;
          runner.payment_amount = item.unit_price;
          runner.payment_id = payment.id;
          runner.mailSent = true;

          const mail = runner.email;

          //? asignamos valores a la variable data de los datos que recogemos desde la respuesta de la api de corredores
          const data = {
            runnerName: runner.name,
            runnerId: runner.id,
            raceName: runner.catValue,
            raceCost: item.unit_price,
            tshirtSize: runner.tshirtSize,
            paymentNumber: payment.id,
            paymentStatus: payment.status_detail,
            mailSent: runner.mailSent,
          };

          //? Manejamos el estado del pago
          const status = payment.status === 'approved' ? true : false;

          //* Dejamos asíncrono para que no interrumpa el flujo de la app
          this.mailer.sendMail([mail], status, data);

          //? Editamos el corredor, y obtenemos la respuesta
          const editRunner = await axios.put(url, runner);

          this.logger.log('Edit runner: ', JSON.stringify(editRunner));

          //? Retornamos la data o nulo, en caso de fallar o que la información ya haya corrido en su flujo normal
          return data;
        } else return null;
      }
    } catch (error) {
      this.logger.error('Error in getRunnerInfo: ', JSON.stringify(error));
      return null;
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
          notification_url: `${envs.API_URL}api/mercadopago/card-notification`,
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
      success: `${envs.WEB_URL}account/payment-user`,
      failure: `${envs.WEB_URL}account/payment-user`,
      pending: `${envs.WEB_URL}account/payment-user`,
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
      notification_url: `${envs.API_URL}api/mercadopago/user-notification`,
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
