import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createTenantDto: CreateTenantDto, operatorId: string) {
    const existing = await this.prisma.tenant.findFirst({
      where: { name: createTenantDto.name },
    });

    if (existing) {
      throw new ConflictException('租户名称已存在');
    }

    const aesKey = crypto.randomBytes(32).toString('base64');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        quota: createTenantDto.quota || 10,
        aesKey,
      },
    });

    await this.auditService.createLog({
      operatorId,
      tenantId: tenant.tenantId,
      actionType: 'TENANT_CREATE',
      details: { name: tenant.name },
    });

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
  }

  async update(tenantId: string, updateTenantDto: UpdateTenantDto, operatorId: string) {
    const tenant = await this.findOne(tenantId);

    const updated = await this.prisma.tenant.update({
      where: { tenantId },
      data: updateTenantDto,
    });

    await this.auditService.createLog({
      operatorId,
      tenantId,
      actionType: 'TENANT_UPDATE',
      details: updateTenantDto,
    });

    return updated;
  }

  async remove(tenantId: string, operatorId: string) {
    const tenant = await this.findOne(tenantId);

    await this.prisma.tenant.update({
      where: { tenantId },
      data: { enabled: false },
    });

    await this.auditService.createLog({
      operatorId,
      tenantId,
      actionType: 'TENANT_DISABLE',
      details: { name: tenant.name },
    });

    return { message: '租户已禁用' };
  }

  async getAesKey(tenantId: string): Promise<string> {
    const tenant = await this.findOne(tenantId);
    return tenant.aesKey;
  }

  async checkQuota(tenantId: string): Promise<boolean> {
    const tenant = await this.findOne(tenantId);
    const activeSessions = await this.prisma.browserSession.count({
      where: { tenantId, status: 'running' },
    });

    return activeSessions < tenant.quota;
  }
}