import { Router } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import AuthMiddleware from '../middleware/auth.middleware';
import Roles from '../middleware/roles.middleware';
import userController from '../controllers/user.controller';

const router: Router = Router();

// 添加用户到租户（租户管理员）
router.post(
  '/:tenantId/users',
  AuthMiddleware as any,
  Roles('tenant_admin', 'super_admin'),
  (req: AuthRequest, res: any) => userController.addUserToTenant(req, res)
);

// 获取租户用户列表（租户管理员）
router.get(
  '/:tenantId/users',
  AuthMiddleware as any,
  Roles('tenant_admin', 'super_admin'),
  (req: AuthRequest, res: any) => userController.getTenantUsers(req, res)
);

// 获取当前登录用户信息
router.get(
  '/me',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => userController.getCurrentUser(req, res)
);

// 更新用户信息
router.put(
  '/:id',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => userController.updateUser(req, res)
);

// 删除用户
router.delete(
  '/:id',
  AuthMiddleware as any,
  Roles('super_admin'),
  (req: AuthRequest, res: any) => userController.deleteUser(req, res)
);

export default router;
