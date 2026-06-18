import { Router } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import AuthMiddleware from '../middleware/auth.middleware';
import Roles from '../middleware/roles.middleware';
import tenantController from '../controllers/tenant.controller';

const router: Router = Router();

// 创建租户（仅超级管理员）
router.post(
  '/',
  AuthMiddleware as any,
  Roles('super_admin'),
  (req: AuthRequest, res: any) => tenantController.createTenant(req, res)
);

// 获取租户列表（仅超级管理员）
router.get(
  '/',
  AuthMiddleware as any,
  Roles('super_admin'),
  (req: AuthRequest, res: any) => tenantController.getTenants(req, res)
);

// 获取租户详情
router.get(
  '/:id',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => tenantController.getTenantById(req, res)
);

// 更新租户信息
router.put(
  '/:id',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => tenantController.updateTenant(req, res)
);

// 删除租户（仅超级管理员）
router.delete(
  '/:id',
  AuthMiddleware as any,
  Roles('super_admin'),
  (req: AuthRequest, res: any) => tenantController.deleteTenant(req, res)
);

export default router;
