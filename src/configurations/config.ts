import { TypeOrmModuleOptions } from '@nestjs/typeorm';

//! Inject config module
import * as dotenv from 'dotenv';
dotenv.config();
const env = process.env.ENV_DEVELOPMENT;

if (env) dotenv.config({ path: `./env/${env}.env` });

const dbUrl = `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const dbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: dbUrl,
  entities: [
    /* include entities here */
  ],
  autoLoadEntities: true,
  synchronize: false, // set to false in production
};

export default dbConfig;
