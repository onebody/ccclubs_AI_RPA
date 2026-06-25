import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'rpa_user',
  password: process.env.DB_PASSWORD || 'rpa_password',
  database: process.env.DB_DATABASE || 'rpa_system',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/db/migrations/*.ts'],
  synchronize: false,
  logging: process.env.LOG_LEVEL === 'debug',
});