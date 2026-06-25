import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../db/entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async create(tenant: Partial<TenantEntity>): Promise<TenantEntity> {
    const newTenant = this.tenantRepository.create(tenant);
    return this.tenantRepository.save(newTenant);
  }

  async findAll(): Promise<TenantEntity[]> {
    return this.tenantRepository.find();
  }

  async findById(id: string): Promise<TenantEntity | null> {
    return this.tenantRepository.findOne({ where: { id } });
  }

  async update(id: string, updates: Partial<TenantEntity>): Promise<TenantEntity | null> {
    await this.tenantRepository.update(id, updates);
    return this.tenantRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) return false;
    await this.tenantRepository.softDelete(id);
    return true;
  }
}