import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/tenant.entity';
import logger from '../utils/logger';

export class TenantController {
  /**
   * 创建租户（仅超级管理员）
   * POST /api/tenants
   */
  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, slug, description, contactEmail, contactPhone, settings } = req.body;

      // 验证必填字段
      if (!name || !slug) {
        res.status(400).json({
          success: false,
          message: 'Name and slug are required',
        });
        return;
      }

      const tenantRepository = AppDataSource.getRepository(Tenant);

      // 检查 slug 是否已存在
      const existingTenant = await tenantRepository.findOne({ where: { slug } });
      if (existingTenant) {
        res.status(409).json({
          success: false,
          message: 'Tenant slug already exists',
        });
        return;
      }

      // 创建新租户
      const tenant = tenantRepository.create({
        name,
        slug,
        description,
        contactEmail,
        contactPhone,
        settings,
        isActive: true,
      });

      await tenantRepository.save(tenant);

      logger.info(`Tenant created: ${tenant.name} (${tenant.id})`);

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: tenant,
      });
    } catch (error) {
      logger.error('Create tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取租户列表（仅超级管理员）
   * GET /api/tenants
   */
  async getTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantRepository = AppDataSource.getRepository(Tenant);
      const tenants = await tenantRepository.find({
        order: { createdAt: 'DESC' },
      });

      res.status(200).json({
        success: true,
        data: tenants,
        count: tenants.length,
      });
    } catch (error) {
      logger.error('Get tenants error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取租户详情
   * GET /api/tenants/:id
   */
  async getTenantById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantRepository = AppDataSource.getRepository(Tenant);

      const tenant = await tenantRepository.findOne({ where: { id } });

      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }

      // 检查权限：超级管理员或本租户用户
      if (req.user?.role !== 'super_admin' && req.user?.tenantId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      logger.error('Get tenant by id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 更新租户信息
   * PUT /api/tenants/:id
   */
  async updateTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, contactEmail, contactPhone, settings, isActive } = req.body;

      const tenantRepository = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepository.findOne({ where: { id } });

      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }

      // 检查权限：超级管理员或租户管理员
      if (req.user?.role !== 'super_admin' && req.user?.tenantId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      // 更新租户信息
      if (name !== undefined) tenant.name = name;
      if (description !== undefined) tenant.description = description;
      if (contactEmail !== undefined) tenant.contactEmail = contactEmail;
      if (contactPhone !== undefined) tenant.contactPhone = contactPhone;
      if (settings !== undefined) tenant.settings = settings;
      if (isActive !== undefined) tenant.isActive = isActive;

      await tenantRepository.save(tenant);

      logger.info(`Tenant updated: ${tenant.name} (${tenant.id})`);

      res.status(200).json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant,
      });
    } catch (error) {
      logger.error('Update tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 删除租户（仅超级管理员）
   * DELETE /api/tenants/:id
   */
  async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantRepository = AppDataSource.getRepository(Tenant);

      const tenant = await tenantRepository.findOne({ where: { id } });

      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }

      // 软删除：设置 isActive = false
      tenant.isActive = false;
      await tenantRepository.save(tenant);

      logger.info(`Tenant deleted (soft): ${tenant.name} (${tenant.id})`);

      res.status(200).json({
        success: true,
        message: 'Tenant deleted successfully',
      });
    } catch (error) {
      logger.error('Delete tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export default new TenantController();
