import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppDataSource } from '../config/database';
import { Competition } from '../entities/competition.entity';
import { Tenant } from '../entities/tenant.entity';
import logger from '../utils/logger';

export class CompetitionController {
  /**
   * 创建比赛
   * POST /api/tenants/:tenantId/competitions
   */
  async createCompetition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const {
        name,
        description,
        startDate,
        endDate,
        location,
        category,
        maxParticipants,
        registrationFee,
        settings,
      } = req.body;

      // 验证必填字段
      if (!name || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Name, startDate, endDate are required',
        });
        return;
      }

      const competitionRepository = AppDataSource.getRepository(Competition);
      const tenantRepository = AppDataSource.getRepository(Tenant);

      // 检查租户是否存在
      const tenant = await tenantRepository.findOne({ where: { id: tenantId } });
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }

      // 创建比赛
      const competition = competitionRepository.create({
        tenantId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        category,
        maxParticipants,
        registrationFee,
        status: 'draft',
        settings,
        isActive: true,
      });

      await competitionRepository.save(competition);

      logger.info(`Competition created: ${competition.name} (${competition.id})`);

      res.status(201).json({
        success: true,
        message: 'Competition created successfully',
        data: competition,
      });
    } catch (error) {
      logger.error('Create competition error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取租户比赛列表
   * GET /api/tenants/:tenantId/competitions
   */
  async getTenantCompetitions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const competitionRepository = AppDataSource.getRepository(Competition);

      const competitions = await competitionRepository.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });

      res.status(200).json({
        success: true,
        data: competitions,
        count: competitions.length,
      });
    } catch (error) {
      logger.error('Get tenant competitions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 获取比赛详情
   * GET /api/competitions/:id
   */
  async getCompetitionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const competitionRepository = AppDataSource.getRepository(Competition);

      const competition = await competitionRepository.findOne({
        where: { id },
        relations: ['tenant'],
      });

      if (!competition) {
        res.status(404).json({
          success: false,
          message: 'Competition not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: competition,
      });
    } catch (error) {
      logger.error('Get competition by id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 更新比赛
   * PUT /api/competitions/:id
   */
  async updateCompetition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        startDate,
        endDate,
        location,
        category,
        maxParticipants,
        registrationFee,
        status,
        settings,
        isActive,
      } = req.body;

      const competitionRepository = AppDataSource.getRepository(Competition);
      const competition = await competitionRepository.findOne({ where: { id } });

      if (!competition) {
        res.status(404).json({
          success: false,
          message: 'Competition not found',
        });
        return;
      }

      // 更新比赛信息
      if (name !== undefined) competition.name = name;
      if (description !== undefined) competition.description = description;
      if (startDate !== undefined) competition.startDate = new Date(startDate);
      if (endDate !== undefined) competition.endDate = new Date(endDate);
      if (location !== undefined) competition.location = location;
      if (category !== undefined) competition.category = category;
      if (maxParticipants !== undefined) competition.maxParticipants = maxParticipants;
      if (registrationFee !== undefined) competition.registrationFee = registrationFee;
      if (status !== undefined) competition.status = status;
      if (settings !== undefined) competition.settings = settings;
      if (isActive !== undefined) competition.isActive = isActive;

      await competitionRepository.save(competition);

      logger.info(`Competition updated: ${competition.name} (${competition.id})`);

      res.status(200).json({
        success: true,
        message: 'Competition updated successfully',
        data: competition,
      });
    } catch (error) {
      logger.error('Update competition error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * 删除比赛
   * DELETE /api/competitions/:id
   */
  async deleteCompetition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const competitionRepository = AppDataSource.getRepository(Competition);

      const competition = await competitionRepository.findOne({ where: { id } });

      if (!competition) {
        res.status(404).json({
          success: false,
          message: 'Competition not found',
        });
        return;
      }

      // 软删除：设置 isActive = false
      competition.isActive = false;
      await competitionRepository.save(competition);

      logger.info(`Competition deleted (soft): ${competition.name} (${competition.id})`);

      res.status(200).json({
        success: true,
        message: 'Competition deleted successfully',
      });
    } catch (error) {
      logger.error('Delete competition error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export default new CompetitionController();
