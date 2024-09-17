import { envs } from './envs';

export const mercadoPagoConfig = {
  //! Seller auth key
  accessToken: envs.MP_ACCESS_TOKEN,
};

export const MP_PROVIDER = 'MERCADO_PAGO_CONFIG';
