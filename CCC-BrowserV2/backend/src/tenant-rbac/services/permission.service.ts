import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../../db/entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async create(permission: Partial<PermissionEntity>): Promise<PermissionEntity> {
    const newPermission = this.permissionRepository.create(permission);
    return this.permissionRepository.save(newPermission);
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.permissionRepository.find();
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    return this.permissionRepository.findOne({ where: { id } });
  }

  async update(id: string, updates: Partial<PermissionEntity>): Promise<PermissionEntity | null> {
    await this.permissionRepository.update(id, updates);
    return this.permissionRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) return false;
    await this.permissionRepository.softDelete(id);
    return true;
  }
}