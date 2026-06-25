import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../db/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findByTenant(tenantId: string): Promise<UserEntity[]> {
    return this.userRepository.find({ where: { tenantId } });
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    await this.userRepository.update(id, updates);
    return this.userRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return false;
    await this.userRepository.softDelete(id);
    return true;
  }
}