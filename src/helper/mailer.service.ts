import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

//? mso: importamos fs y path
import * as fs from 'fs';
import * as path from 'path';
import { RunnerDto } from 'src/runners.modules/runners/runners.dto';

const model = (item: any) => {
  return ``;
};

@Injectable()
export class Mailer {
  constructor(private readonly mailerService: MailerService) {}

  //? creamos funcion para leer templates, pasamos el nombre del template y los datos
  private async getTemplate(templateName: string, data: any): Promise<string> {
    const filePath = path.join(__dirname, 'templates', `${templateName}.html`)
    //? leemos el archivo
    const template = await fs.promises.readFile(filePath, 'utf-8')
    //? reemplazamos los datos con la funcion replace placeholders
    return this.replacePlaceHolders(template, data)
  }

  //? la funcion para reemplazar los placeholders toma los datos y hace los cambios que necesitamos en el template
  private replacePlaceHolders(template: string, data: any): string {
    return template.replace(/{{(\w+)}}/g, (_, key) => data[key] || '');
  }

  async sendMail(to: string[], status: boolean, data: any): Promise<any> {
    //? dependendiendo del estado del pago asignamos un nombre al template
    const templateName = status ? 'approved' : 'rejected'
    //? en base al status de pago elegimos que template usar (los html se llaman approved o rejected)
    const html = await this.getTemplate(templateName, data)
    try {
      const response = await this.mailerService.sendMail({
        to: to,
        from: 'notificaciones@esanma.hvdevs.com',
        //cc: 'raqueveque@blister.com.ar',
        subject: "MMRUN' 2024",
        //? pasamos el template modificado
        html,
      });
      console.log(response);
      return response;
    } catch (e) {
      console.log(e);
      return { rejected: [to] };
    }
  }

  //? creamos funcion para obtener datos del corredor
  async getRunnerData(): Promise<any> {
    try {
      const response = await axios.get('https://api.mmrun.hvdevs.com/runners')
      return response.data
      
    } catch (error) {
      
    }
  }

}
