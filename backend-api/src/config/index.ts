import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface Config {
  env: string;
  port: number;
  host: string;
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  log: {
    level: string;
    dir: string;
  };
  security: {
    helmetEnabled: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  api: {
    version: string;
    prefix: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
  security: {
    helmetEnabled: process.env.HELMET_ENABLED === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
  },
};

export default config;
