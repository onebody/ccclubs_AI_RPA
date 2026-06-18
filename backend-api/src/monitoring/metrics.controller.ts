import { Router, Request, Response } from 'express';
import { metricsService, Metrics, HealthCheck } from '../monitoring/metrics.service';
import { loggerService } from '../logging/logger.service';

const router: Router = Router();

// 查询实时监控指标
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req.query.tenantId as string);
    const timeRange = (req.query.timeRange as 'minute' | 'hour' | 'day') || 'hour';

    const metrics = await metricsService.getMetrics(tenantId, timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    loggerService.error('Failed to get metrics', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// 健康检查（基础）
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const healthCheck = await metricsService.getHealthCheck();

    const statusCode = healthCheck.status === 'healthy' ? 200
      : healthCheck.status === 'degraded' ? 200
      : 503;

    res.status(statusCode).json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    loggerService.error('Health check failed', error as Error);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// 就绪检查（用于 Kubernetes）
router.get('/health/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const healthCheck = await metricsService.getHealthCheck();
    const isReady = healthCheck.checks.redis === 'up';

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      message: isReady ? 'Service is ready' : 'Service is not ready',
      data: healthCheck.checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// 存活检查（用于 Kubernetes）
router.get('/health/live', async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Service is alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 获取指定租户的监控指标
router.get('/metrics/tenant/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const timeRange = (req.query.timeRange as 'minute' | 'hour' | 'day') || 'hour';

    const metrics = await metricsService.getMetrics(tenantId, timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    loggerService.error('Failed to get tenant metrics', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant metrics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// 获取系统概况（管理员接口）
router.get('/metrics/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: 添加权限检查（只有 super_admin 可以访问）
    const metrics = await metricsService.getMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    loggerService.error('Failed to get overview metrics', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overview metrics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

export default router;
