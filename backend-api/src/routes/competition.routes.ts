import { Router } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import AuthMiddleware from '../middleware/auth.middleware';
import Roles from '../middleware/roles.middleware';
import competitionController from '../controllers/competition.controller';

const router: Router = Router();

// 创建比赛
router.post(
  '/:tenantId/competitions',
  AuthMiddleware as any,
  Roles('tenant_admin', 'super_admin'),
  (req: AuthRequest, res: any) => competitionController.createCompetition(req, res)
);

// 获取租户比赛列表
router.get(
  '/:tenantId/competitions',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => competitionController.getTenantCompetitions(req, res)
);

// 获取比赛详情
router.get(
  '/:id',
  AuthMiddleware as any,
  (req: AuthRequest, res: any) => competitionController.getCompetitionById(req, res)
);

// 更新比赛
router.put(
  '/:id',
  AuthMiddleware as any,
  Roles('tenant_admin', 'super_admin'),
  (req: AuthRequest, res: any) => competitionController.updateCompetition(req, res)
);

// 删除比赛
router.delete(
  '/:id',
  AuthMiddleware as any,
  Roles('tenant_admin', 'super_admin'),
  (req: AuthRequest, res: any) => competitionController.deleteCompetition(req, res)
);

export default router;
