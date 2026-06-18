import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import logger from '../utils/logger';

/**
 * 角色验证中间件 - 验证用户是否拥有 requiredRoles 中的任一角色
 */
export const Roles = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
         res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const userRole = req.user.role;

      // 超级管理员拥有所有权限
      if (userRole === 'super_admin') {
        logger.info(`Super admin access granted: ${req.user.email}`);
        next();
        return;
      }

      // 检查用户角色是否在允许的角色列表中
      if (allowedRoles.includes(userRole)) {
        logger.info(`Role access granted: ${req.user.email} (${userRole})`);
        next();
      } else {
        logger.warn(`Access denied: ${req.user.email} (${userRole}) - Required roles: ${allowedRoles.join(', ')}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredRoles: allowedRoles,
          userRole: userRole,
        });
      }
    } catch (error) {
      logger.error('Role validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during role validation',
      });
    }
  };
};

export default Roles;
