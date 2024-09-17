import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

//? mso: importamos fs y path
import * as fs from 'fs';

const model = (item: any) => {
  return ``;
};

@Injectable()
export class Mailer {
  constructor(private readonly mailerService: MailerService) {}

  //? creamos función para leer templates, pasamos el nombre del template y los datos
  private async getTemplate(templateName: string, data: any): Promise<string> {
    const filePath = `./templates/${templateName}.html`
    //? leemos el archivo
    const template = await fs.promises.readFile(filePath, 'utf-8')
    //? reemplazamos los datos con la función replace placeholders
    return this.replacePlaceHolders(template, data)
  }

  //? la función para reemplazar los placeholders toma los datos y hace los cambios que necesitamos en el template
  private replacePlaceHolders(template: string, data: any): string {
    return template.replace(/{{(\w+)}}/g, (_, key) => data[key] || '');
  }

  async sendMail(to: string[], status: boolean, data: any): Promise<any> {
    //? dependiendo del estado del pago asignamos un nombre al template
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
      return response;
    } catch (e) {
      console.error(e);
      return { rejected: [to] };
    }
  }

  //? creamos función para obtener datos del corredor
  async getRunnerData(id: string): Promise<any> {
    try {
      const response = await axios.get('https://api.mmrun.hvdevs.com/runners/'+id)
      return response
      
    } catch (error) {
      return error
    }
  }

}
