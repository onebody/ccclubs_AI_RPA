import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppDataSource } from '../config/database';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import logger from '../utils/logger';
import * as bcrypt from 'bcrypt';

export class UserController {
  /**
   * 添加用户到租户（租户管理员）
   * POST /api/tenants/:tenantId/users
   */
  async addUserToTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { email, password, firstName, lastName, phone, role } = req.body;

      // 验证必填字段
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Email, password, firstName, lastName are required',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const tenantRepository = AppDataSource.getRepository(Tenant);
      const userTenantRepository = AppDataSource.getRepository(UserTenant);

      // 检查租户是否存在
      const tenant = await tenantRepository.findOne({ where: { id: tenantId } });
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }

      // 检查用户是否已存在
      let user = await userRepository.findOne({ where: { email } });

      if (!user) {
        // 创建新用户
        const hashedPassword = await bcrypt.hash(password, 10);
        user = userRepository.create({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: role || 'participant',
          isActive: true,
        });
        await userRepository.save(user);
      }

      // 检查用户是否已在租户中
      const existingUserTenant = await userTenantRepository.findOne({
        where: { userId: user.id, tenantId },
      });

      if (existingUserTenant) {
        res.status(409).json({
          success: false,
          message: 'User already exists in this tenant',
        });
        return;
      }

      // 创建用户-租户关联
      const userTenant = userTenantRepository.create({
        userId: user.id,
        tenantId,
        isDefault: false,
      });
      await userTenantRepository.save(userTenant);

      logger.info(`User added to tenant: ${user.email} -> ${tenant.name}`);

      res.status(201).json({
        success: true,
        message: 'User added to tenant successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
          },
        },
      });
    } catch (error) {
      logger.error('Add user to tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取租户用户列表（租户管理员）
   * GET /api/tenants/:tenantId/users
   */
  async getTenantUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const userTenantRepository = AppDataSource.getRepository(UserTenant);

      const userTenants = await userTenantRepository.find({
        where: { tenantId },
        relations: ['user'],
      });

      const users = userTenants.map((ut) => ({
        id: ut.user.id,
        email: ut.user.email,
        firstName: ut.user.firstName,
        lastName: ut.user.lastName,
        phone: ut.user.phone,
        role: ut.user.role,
        isActive: ut.user.isActive,
        isDefault: ut.isDefault,
        createdAt: ut.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      logger.error('Get tenant users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取当前登录用户信息
   * GET /api/users/me
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 更新用户信息
   * PUT /api/users/:id
   */
  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, avatarUrl, isActive } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // 检查权限：只能更新自己的信息，或者超级管理员
      if (req.user?.role !== 'super_admin' && req.user?.id !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      // 更新用户信息
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (isActive !== undefined && req.user?.role === 'super_admin') {
        user.isActive = isActive;
      }

      await userRepository.save(user);

      logger.info(`User updated: ${user.email} (${user.id})`);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 删除用户
   * DELETE /api/users/:id
   */
  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // 超级管理员不能被删除
      if (user.role === 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Cannot delete super admin',
        });
        return;
      }

      // 软删除：设置 isActive = false
      user.isActive = false;
      await userRepository.save(user);

      logger.info(`User deleted (soft): ${user.email} (${user.id})`);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export default new UserController();
