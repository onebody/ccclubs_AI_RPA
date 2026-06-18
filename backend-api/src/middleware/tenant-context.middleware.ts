import { Request, Response, NextFunction } from 'express';
import { DataSource, QueryRunner } from 'typeorm';
import { AuthRequest } from './auth.middleware';
import logger from '../utils/logger';

/**
 * 租户上下文中间件 - 设置 RLS 租户上下文
 * 必须在认证中间件之后使用
 */
export const TenantContextMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
       res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!tenantId && userRole !== 'super_admin') {
       res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    // 获取数据库连接
    const AppDataSource = req.app.get('dataSource');
    
    if (!AppDataSource) {
      logger.error('DataSource not found in app context');
       res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
      return;
    }

    // 设置租户上下文（PostgreSQL session variables）
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // 设置会话变量
    await queryRunner.query(`SELECT set_tenant_context($1, $2, $3)`, [
      tenantId || '',
      userId,
      userRole,
    ]);

    // 将 queryRunner 附加到 request，以便在请求结束后清理
    (req as any).queryRunner = queryRunner;

    logger.info(`Tenant context set: tenantId=${tenantId}, userId=${userId}, role=${userRole}`);

    next();
  } catch (error) {
    logger.error('Tenant context setup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set tenant context',
    });
  }
};

/**
 * 请求结束后的清理中间件 - 释放数据库连接
 */
export const TenantContextCleanup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  res.on('finish', async () => {
    const queryRunner = (req as any).queryRunner;
    if (queryRunner) {
      try {
        await queryRunner.query('SELECT clear_tenant_context()');
        await queryRunner.release();
        logger.info('Tenant context cleaned up');
      } catch (error) {
        logger.error('Tenant context cleanup failed:', error);
      }
    }
  });

  next();
};

export default TenantContextMiddleware;
