//! Inject config module
import * as dotenv from 'dotenv';
dotenv.config();

export const mercadoPagoConfig = {
  //! Seller auth key
  accessToken: process.env.MP_ACCESS_TOKEN,
};
