import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { MercadopagoService } from './mercadopago.service';
import { Response } from 'express';
import { Items } from 'mercadopago/dist/clients/commonTypes';

@Controller('mercadopago')
export class MercadopagoController {
  constructor(private readonly service: MercadopagoService) {}

  @Post('create-preference')
  async createPaymentPreference(@Body() item: Items, @Res() res) {
    this.service.createPreference(item, res);
  }

  @Post('notification')
  async notification(@Res() res: Response, @Body() body) {
    if (body.data) {
      const response = await this.service.notification(body.data);
      console.log(response);
      //! Mercadopago needs the response from our server:
      switch (response) {
        case 404: {
          res.status(response).send('Not Found');
          break;
        }
        case 200: {
          res.status(response).send('Success');
          break;
        }
        case 409: {
          res.status(response).send('Already exist');
          break;
        }
        default: {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .send('Internal server error');
          break;
        }
      }
    } else {
      res.status(HttpStatus.BAD_REQUEST).send('Failed');
    }
  }

  //! --------------------------------------------------------------------------------------->
  //* Deprecated

  @Post('card-payment-parking')
  /**@deprecated Not for use */
  async cardPayment(@Res() res: Response, @Body() body) {
    console.log(body);
    if (body) {
      const result = await this.service.cardPaymentDone(body);
      res.status(HttpStatus.OK).json(result);
    } else {
      res.status(HttpStatus.OK).json({
        ok: false,
        msg: 'rejected',
      });
    }
  }

  @Post('create-user-parking-preference')
  /**@deprecated Not for use */
  async userPaymentPreference(@Body() item: Items, @Res() res) {
    this.service.userPaymentPreference(item, res);
  }

  @Post('user-notification')
  /**@deprecated Not for use */
  async userNotification(@Res() res: Response, @Body() body) {
    console.log(body);
    if (body.data) {
      const response = await this.service.parkingUserPaymentDone(body.data);
      //! Mercadopago needs the response from our server:
      switch (response) {
        case 404: {
          res.status(response).send('Not Found');
          break;
        }
        case 200: {
          res.status(response).send('Success');
          break;
        }
        case 409: {
          res.status(response).send('Already exist');
          break;
        }
        default: {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .send('Internal server error');
          break;
        }
      }
    } else {
      res.status(HttpStatus.BAD_REQUEST).send('Failed');
    }
  }

  @Post('card-user-payment-parking')
  /**@deprecated Not for use */
  async cardUserPayment(@Res() res: Response, @Body() body) {
    // console.log(body)
    if (body) {
      const result = await this.service.cardUserPaymentDone(body);
      res.status(HttpStatus.OK).json(result);
    } else {
      res.status(HttpStatus.OK).json({
        ok: false,
        msg: 'rejected',
      });
    }
  }

  /**
   * @description Mercado pago puede mandar notificaciones con el pago de tarjetas.
   */
  @Post('card-notification')
  /**@deprecated Not for use */
  async cardNotification(@Res() res: Response, @Body() body) {
    console.log(body);
    if (body.data) {
      const response = await this.service.cardNotification(body.data);
      console.log(response);
    }
  }
  //* Deprecated
  //! --------------------------------------------------------------------------------------->
}
