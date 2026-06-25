import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProcessEntity } from '../../db/entities/process.entity';
import { JwtAuthGuard } from '../../tenant-rbac/guards/jwt-auth.guard';

@Controller('process-configs')
@UseGuards(JwtAuthGuard)
export class ProcessConfigController {
  constructor(
    @InjectRepository(ProcessEntity)
    private readonly processRepository: Repository<ProcessEntity>,
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.processRepository.find({
      where: { tenantId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    return this.processRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    const tenantId = req.tenantId;
    const process = this.processRepository.create({
      ...data,
      tenantId,
    });
    return this.processRepository.save(process);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const tenantId = req.tenantId;
    await this.processRepository.update(
      { id, tenantId },
      { ...data },
    );
    return this.processRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    await this.processRepository.softDelete({ id, tenantId });
    return { success: true };
  }
}