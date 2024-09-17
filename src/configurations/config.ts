import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envs } from './envs';

const dbUrl = `postgres://${envs.DB_USERNAME}:${envs.DB_PASSWORD}@${envs.DB_HOST}:${envs.DB_PORT}/${envs.DB_DATABASE}`;

export const dbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: dbUrl,
  entities: [
    /* include entities here */
  ],
  autoLoadEntities: true,
  synchronize: false, // set to false in production
};
