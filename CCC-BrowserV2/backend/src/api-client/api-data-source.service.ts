import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiDataSourceEntity } from '../db/entities/api-data-source.entity';
import { ApiClientService } from './api-client.service';

@Injectable()
export class ApiDataSourceService {
  private readonly logger = new Logger(ApiDataSourceService.name);

  constructor(
    @InjectRepository(ApiDataSourceEntity)
    private readonly apiDataSourceRepository: Repository<ApiDataSourceEntity>,
    private readonly apiClientService: ApiClientService,
  ) {}

  async create(dataSource: Omit<ApiDataSourceEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<ApiDataSourceEntity> {
    const newDataSource = this.apiDataSourceRepository.create(dataSource);
    return this.apiDataSourceRepository.save(newDataSource);
  }

  async update(id: string, updates: Partial<ApiDataSourceEntity>): Promise<ApiDataSourceEntity | null> {
    await this.apiDataSourceRepository.update(id, updates);
    return this.apiDataSourceRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const dataSource = await this.apiDataSourceRepository.findOne({ where: { id } });
    if (!dataSource) {
      return false;
    }
    await this.apiDataSourceRepository.softDelete(id);
    return true;
  }

  async findById(id: string): Promise<ApiDataSourceEntity | null> {
    return this.apiDataSourceRepository.findOne({ where: { id } });
  }

  async findByTenant(tenantId: string): Promise<ApiDataSourceEntity[]> {
    return this.apiDataSourceRepository.find({ where: { tenantId } });
  }

  async findAll(): Promise<ApiDataSourceEntity[]> {
    return this.apiDataSourceRepository.find();
  }

  async fetchData(id: string, tenantId: string): Promise<any[]> {
    const dataSource = await this.apiDataSourceRepository.findOne({
      where: { id, tenantId },
    });

    if (!dataSource) {
      throw new Error('API data source not found');
    }

    const headers = dataSource.headers as Record<string, string> || {};
    const params = dataSource.params as Record<string, any> || {};

    const decryptedHeaders = this.apiClientService.decryptHeaders(headers);

    if (dataSource.method === 'POST') {
      const response = await this.apiClientService.request({
        method: 'POST',
        url: dataSource.url,
        headers: decryptedHeaders,
        data: params,
        dataPath: dataSource.dataPath,
      });
      return response.success ? (response.data as any[]) : [];
    } else {
      const response = await this.apiClientService.request({
        method: 'GET',
        url: dataSource.url,
        headers: decryptedHeaders,
        params,
        dataPath: dataSource.dataPath,
      });
      return response.success ? (response.data as any[]) : [];
    }
  }

  async fetchBatchData(id: string, tenantId: string, batchSize?: number): Promise<any[]> {
    const dataSource = await this.apiDataSourceRepository.findOne({
      where: { id, tenantId },
    });

    if (!dataSource) {
      throw new Error('API data source not found');
    }

    const size = batchSize || dataSource.batchSize || 50;
    const headers = dataSource.headers as Record<string, string> || {};
    const decryptedHeaders = this.apiClientService.decryptHeaders(headers);

    const paginationConfig = dataSource.paginationConfig as Record<string, any> || {};

    return this.apiClientService.fetchPaginatedData(dataSource.url, {
      params: dataSource.params as Record<string, any>,
      headers: decryptedHeaders,
      dataPath: dataSource.dataPath,
      pageParam: paginationConfig.pageParam || 'page',
      pageSize: size,
      maxPages: paginationConfig.maxPages || 100,
    });
  }

  async testConnection(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      const dataSource = await this.apiDataSourceRepository.findOne({
        where: { id, tenantId },
      });

      if (!dataSource) {
        return { success: false, message: 'API data source not found' };
      }

      const headers = dataSource.headers as Record<string, string> || {};
      const decryptedHeaders = this.apiClientService.decryptHeaders(headers);

      const response = await this.apiClientService.request({
        method: dataSource.method as any,
        url: dataSource.url,
        headers: decryptedHeaders,
        params: dataSource.params as Record<string, any>,
        timeout: 10000,
      });

      return {
        success: response.success,
        message: response.success ? 'Connection successful' : (response.message || 'Unknown error'),
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}