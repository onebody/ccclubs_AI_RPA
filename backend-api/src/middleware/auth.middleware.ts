import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

export const AuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authorization header missing or invalid',
    });
    return;
  }

  const token = authHeader.substring(7);
  
  // 验证 JWT token
  const decoded = jwt.verify(token, config.jwt.secret) as any;
  
  // 设置用户信息到 request
  req.user = {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    tenantId: decoded.tenantId,
  };

  logger.info(`Authenticated user: ${req.user.email} (${req.user.role})`);
  next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export default AuthMiddleware;
