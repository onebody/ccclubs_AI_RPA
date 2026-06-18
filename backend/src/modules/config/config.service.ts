import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  async getProxyConfig() {
    return {
      enabled: process.env.PROXY_ENABLED === 'true',
      poolUrl: process.env.PROXY_POOL_URL,
      rotationInterval: process.env.PROXY_ROTATION_INTERVAL || '60000',
    };
  }

  async getSecurityConfig() {
    return {
      allowedOrigins: process.env.CORS_ORIGINS || '*',
      maxUploadSize: process.env.MAX_UPLOAD_SIZE || '50MB',
    };
  }

  async getPerformanceConfig() {
    return {
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '100'),
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30'),
    };
  }
}