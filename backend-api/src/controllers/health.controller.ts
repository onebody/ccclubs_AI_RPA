import { Request, Response } from 'express';
import os from 'os';

interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptime: number;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      total: string;
      free: string;
      used: string;
    };
    cpu: {
      cores: number;
      model: string;
      load: number[];
    };
  };
}

// 健康检查控制器
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  const healthData: HealthResponse = {
    success: true,
    message: 'AI Browser SaaS Backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        load: os.loadavg(),
      },
    },
  };

  res.status(200).json(healthData);
};

// 简单的 ping 端点
export const ping = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
};
