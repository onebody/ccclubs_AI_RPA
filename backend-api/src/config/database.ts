import { DataSource } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Competition } from '../entities/competition.entity';
import { Participant } from '../entities/participant.entity';
import { Score } from '../entities/score.entity';
import { Announcement } from '../entities/announcement.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'qi_yun_ai',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [Tenant, User, UserTenant, Competition, Participant, Score, Announcement],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  extra: {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});
