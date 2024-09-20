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
    private readonly mailService: Mailer,
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
}
