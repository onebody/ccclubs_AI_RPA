import { Router } from 'express';
import { healthCheck, ping } from '../controllers/health.controller';

const router: Router = Router();

// 健康检查端点
router.get('/check', healthCheck);

// Ping 端点
router.get('/ping', ping);

// 就绪检查（用于 Kubernetes）
router.get('/ready', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is ready',
    timestamp: new Date().toISOString(),
  });
});

// 存活检查（用于 Kubernetes）
router.get('/live', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
