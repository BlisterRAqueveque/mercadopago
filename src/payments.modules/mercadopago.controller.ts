import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { MercadopagoService } from './mercadopago.service';
import { Response } from 'express';
import { Items } from 'mercadopago/dist/clients/commonTypes';
import { FileInterceptor } from '@nestjs/platform-express';
import { RunnerDto } from 'src/runners.modules/runners/runners.dto';
import { Mailer } from 'src/helper/mailer.service';

@Controller('mercadopago')
export class MercadopagoController {
  constructor(
    private readonly service: MercadopagoService,
    /** @test Test Only Purposes*/
    private readonly mailService: Mailer 
    ) {}

  @Post('create-preference')
  @UseInterceptors(FileInterceptor('form'))
  async createPaymentPreference(@Body() item: any, @Res() res) {
    const itemMp: Items = item;
    const runner: RunnerDto = item;
    this.service.createPreference(itemMp, runner, res);
  }

  @Post('notification')
  async notification(@Res() res: Response, @Body() body) {
    if (body.data) {
      const response = await this.service.notification(body.data);
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

  //? Test Only Purposes
  @Post('send-mail')
  /**@test Test Only Not for use */
  async sendMail(@Body() body: any, @Res() res) {
    const { runnerId,
      runnerEmail,
      approved,
    } = body
    let responseRunner 
    let data
    
    responseRunner = await this.mailService.getRunnerData(runnerId.toString())

    data = {
      runnerName : responseRunner.data.name,
      runnerId: responseRunner.data.id,
      raceName: responseRunner.data.catValue,
      raceCost: "payment.additional_info.items[0].unit_price",
      tshirtSize: responseRunner.data.tshirtSize,
      paymentNumber: "payment.id",
      paymentStatus: "payment.status_detail"
    }

    this.mailService.sendMail([runnerEmail], approved, data)
  } 

  @Post('user-notification')
  /**@deprecated Not for use */
  async userNotification(@Res() res: Response, @Body() body) {
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
    if (body.data) {
      const response = await this.service.cardNotification(body.data);
    }
  }
  //* Deprecated
  //! --------------------------------------------------------------------------------------->
}
