import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  operatorId: string;
  tenantId: string;
  sessionId?: string;
  actionType: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createLog(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        operatorId: dto.operatorId,
        tenantId: dto.tenantId,
        sessionId: dto.sessionId,
        actionType: dto.actionType,
        details: dto.details,
      },
    });
  }

  async findByTenant(tenantId: string, params?: {
    actionType?: string;
    startTime?: Date;
    endTime?: Date;
  }) {
    const where: Record<string, any> = { tenantId };

    if (params?.actionType) {
      where.actionType = params.actionType;
    }

    if (params?.startTime) {
      where.actionTime = { ...where.actionTime, gte: params.startTime };
    }

    if (params?.endTime) {
      where.actionTime = { ...where.actionTime, lte: params.endTime };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { actionTime: 'desc' },
    });
  }

  async findBySession(sessionId: string) {
    return this.prisma.auditLog.findMany({
      where: { sessionId },
      orderBy: { actionTime: 'desc' },
    });
  }
}