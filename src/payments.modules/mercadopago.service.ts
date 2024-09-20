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
import axios from 'axios';
import * as mercadopago from 'mercadopago';
import { Items } from 'mercadopago/dist/clients/commonTypes';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import {
  BackUrls,
  PreferenceRequest,
  PreferenceResponse,
} from 'mercadopago/dist/clients/preference/commonTypes';
import { Options } from 'mercadopago/dist/types';
import { CustomItem } from 'src/common';
import { envs, MP_PROVIDER } from 'src/configurations';
import { Mailer } from 'src/helper/mailer.service';
import { RunnerDto } from 'src/runners.modules/runners/runners.dto';
import { PaymentsService } from './payments/payments.service';

type Statuses =
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'pending'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'cancelled'
  | 'charged_back';

@Injectable()
export class MercadopagoService {
  //! MP Options
  options: Options = {
    timeout: 5000, //* Response timeout () => mercadopago API
  };

  //! MP Configurations
  configMp = new mercadopago.MercadoPagoConfig({
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
      // Insertamos el corredor en la API Rest principal
      const response = await axios.post(`${envs.MMRUN_API}runners`, runner);
      // Obtenemos la respuesta y guardamos en la variable
      const runnerResponse: RunnerDto = response.data;

      const items: Items[] = [
        {
          //! Some random item (test only)
          id: runnerResponse.id as any,
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

      const preference: PreferenceRequest = {
        items: items,
        purpose: 'wallet_purchase',
        back_urls: backUrls,
        auto_return: 'approved',
        notification_url: `${envs.API_URL}api/mercadopago/notification`,
      };

      //? Added 20240712: for Caminata circuit no charges should be applied

      //? check if description is Caminata
      if (item.description === 'Caminata') {
        //? create an object with runner data for mail purposes
        let datos: CustomItem = {
          runnerName: runnerResponse.name,
          runnerId: runnerResponse.id,
          raceName: runnerResponse.catValue,
          raceCost: '$ 0.00', //? no cost
          tshirtSize: runnerResponse.tshirtSize,
          paymentNumber: 'No hubieron cargos', //? no cost
          paymentStatus: 'No hubieron cargos', //? no cost
          mailSent: false,
          email: runnerResponse.email,
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

      let data: CustomItem;

      try {
        data = await this.getRunnerInfo(payment);
      } catch (error) {
        this.logger.error('Error in notification', JSON.stringify(error));
      }

      //? Se inserta el pago, o en su defecto, se actualiza el estado
      const result = await this.paymentService.insert({ ...payment });

      //! Solo en caso que el status cambie, se envía por última vez el mail
      if (result.status !== payment.status && data) {
        //? Manejamos el estado del pago
        const status = payment.status === 'approved' ? true : false;

        //* Dejamos asíncrono para que no interrumpa el flujo de la app
        this.mailer.sendMail([data.email], status, data);
      }
      this.logger.log('Payment status: ', result.status);
      return response.status;
    } catch (e: any) {
      this.logger.error('Error in notification: ', JSON.stringify(e));
      //! Handle errors
      if (e.response ? e.response.status : false) return e.response.status;
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
        console.log(runner);

        //? Edita la información del usuario, con el pago y demás
        runner.status = payment.status;
        runner.status_detail = payment.status_detail;
        runner.payment_amount = item.unit_price;
        runner.payment_id = payment.id;

        const mail = runner.email;

        //? asignamos valores a la variable data de los datos que recogemos desde la respuesta de la api de corredores
        const data: CustomItem = {
          runnerName: runner.name,
          runnerId: runner.id,
          raceName: runner.catValue,
          raceCost: item.unit_price,
          tshirtSize: runner.tshirtSize,
          paymentNumber: payment.id,
          paymentStatus: payment.status_detail,
          mailSent: runner.mailSent,
          email: runner.email,
        };

        if (runner ? !runner.mailSent : false) {
          //? Manejamos el estado del pago
          const status = payment.status === 'approved' ? true : false;

          //* Dejamos asíncrono para que no interrumpa el flujo de la app
          this.mailer.sendMail([mail], status, data);

          runner.mailSent = true;

          //? Editamos el corredor, y obtenemos la respuesta
          const editRunner = await axios.put(url, runner);

          this.logger.log(
            'Edit runner: ',
            `email sent: ${runner.email} | payment status: ${payment.status}`,
          );

          //? Retornamos la data o nulo, en caso de fallar o que la información ya haya corrido en su flujo normal
          return data;
        } else return data;
      }
    } catch (error) {
      this.logger.error('Error in getRunnerInfo: ', JSON.stringify(error));
      return null;
    }
  }
}
