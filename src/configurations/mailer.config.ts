import { MailerOptions } from '@nestjs-modules/mailer';
import { envs } from './envs';

export const mConfig: MailerOptions = {
  transport: {
    host: envs.NODEMAILER_HOST,
    secure: false,
    tls: { rejectUnauthorized: false },
    port: envs.NODEMAILER_PORT,
    auth: {
      user: envs.NODEMAILER_USER,
      pass: envs.NODEMAILER_PASS,
    },
  },
};
