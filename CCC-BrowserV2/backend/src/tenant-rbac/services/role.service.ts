import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../db/entities/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async create(role: Partial<RoleEntity>): Promise<RoleEntity> {
    const newRole = this.roleRepository.create(role);
    return this.roleRepository.save(newRole);
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find();
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.roleRepository.findOne({ where: { id } });
  }

  async findByTenant(tenantId: string): Promise<RoleEntity[]> {
    return this.roleRepository.find({ where: { tenantId } });
  }

  async update(id: string, updates: Partial<RoleEntity>): Promise<RoleEntity | null> {
    await this.roleRepository.update(id, updates);
    return this.roleRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) return false;
    await this.roleRepository.softDelete(id);
    return true;
  }
}