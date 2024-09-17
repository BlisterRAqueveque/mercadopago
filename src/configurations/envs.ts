import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_DATABASE: string;
  MP_ACCESS_TOKEN: string;
  WEB_URL: string;
  API_URL: string;
  NODEMAILER_HOST: string;
  NODEMAILER_PORT: number;
  NODEMAILER_USER: string;
  NODEMAILER_PASS: string;
  MMRUN_API: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_DATABASE: joi.string().required(),
    MP_ACCESS_TOKEN: joi.string().required(),
    WEB_URL: joi.string().required(),
    API_URL: joi.string().required(),
    NODEMAILER_HOST: joi.string().required(),
    NODEMAILER_PORT: joi.number().required(),
    NODEMAILER_USER: joi.string().required(),
    NODEMAILER_PASS: joi.string().required(),
    MMRUN_API: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

const envVars: EnvVars = value;

export const envs = {
  PORT: envVars.PORT,
  DB_USERNAME: envVars.DB_USERNAME,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_HOST: envVars.DB_HOST,
  DB_PORT: envVars.DB_PORT,
  DB_DATABASE: envVars.DB_DATABASE,
  MP_ACCESS_TOKEN: envVars.MP_ACCESS_TOKEN,
  WEB_URL: envVars.WEB_URL,
  API_URL: envVars.API_URL,
  NODEMAILER_HOST: envVars.NODEMAILER_HOST,
  NODEMAILER_PORT: envVars.NODEMAILER_PORT,
  NODEMAILER_USER: envVars.NODEMAILER_USER,
  NODEMAILER_PASS: envVars.NODEMAILER_PASS,
  MMRUN_API: envVars.MMRUN_API,
};
