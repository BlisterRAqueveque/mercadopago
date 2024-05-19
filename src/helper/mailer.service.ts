import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

const model = (item: any) => {
  return ``;
};

@Injectable()
export class Mailer {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(to: string[], status: boolean): Promise<any> {
    try {
      const response = await this.mailerService.sendMail({
        to: to,
        from: 'notificaciones@esanma.hvdevs.com',
        //cc: 'raqueveque@blister.com.ar',
        subject: "MMRUN' 2024",
        html: model(status ? 'Aprobado' : 'Rechazado'),
      });
      console.log(response);
      return response;
    } catch (e) {
      console.log(e);
      return { rejected: [to] };
    }
  }
}
