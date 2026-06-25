import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EncryptionService } from '../common/services/encryption.service';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: Record<string, any>;
  timeout?: number;
  dataPath?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly encryptionService: EncryptionService) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`API request failed: ${error.message}`);
        throw error;
      },
    );
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      url: options.url,
      headers: options.headers,
      timeout: options.timeout || 30000,
    };

    if (options.method === 'GET') {
      config.params = options.params;
    } else {
      config.data = options.data;
    }

    this.logger.log(`Making API request: ${config.method} ${config.url}`);

    try {
      const response: AxiosResponse = await this.axiosInstance(config);
      const data = this.extractData(response.data, options.dataPath);

      return {
        success: true,
        data: data as T,
        message: 'Request successful',
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        data: null as any,
        message: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  async get<T>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params, headers });
  }

  async post<T>(url: string, data?: Record<string, any>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, headers });
  }

  async put<T>(url: string, data?: Record<string, any>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data, headers });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, headers });
  }

  async batchGet<T>(
    url: string,
    paramsList: Record<string, any>[],
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>[]> {
    const results = await Promise.all(
      paramsList.map((params) => this.get<T>(url, params, headers)),
    );
    this.logger.log(`Batch request completed: ${results.length} requests`);
    return results;
  }

  async fetchPaginatedData<T>(
    url: string,
    config: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      dataPath?: string;
      pageParam?: string;
      totalParam?: string;
      pageSize?: number;
      maxPages?: number;
    },
  ): Promise<T[]> {
    const allData: T[] = [];
    const pageSize = config.pageSize || 50;
    const maxPages = config.maxPages || 100;
    const pageParam = config.pageParam || 'page';
    let currentPage = 1;

    while (currentPage <= maxPages) {
      const params = {
        ...config.params,
        [pageParam]: currentPage,
        pageSize,
      };

      const response = await this.get<T[]>(url, params, config.headers);
      if (!response.success || !response.data || response.data.length === 0) {
        break;
      }

      allData.push(...response.data);
      currentPage++;

      if (response.data.length < pageSize) {
        break;
      }
    }

    this.logger.log(`Fetched ${allData.length} records from ${currentPage - 1} pages`);
    return allData;
  }

  private extractData(data: any, dataPath?: string): any {
    if (!dataPath) {
      return data;
    }

    const pathParts = dataPath.split('.');
    let result = data;

    for (const part of pathParts) {
      if (result === undefined || result === null) {
        return data;
      }
      result = result[part];
    }

    return result;
  }

  encryptHeaders(headers: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('secret')) {
        encrypted[key] = this.encryptionService.encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  decryptHeaders(headers: Record<string, string>): Record<string, string> {
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('secret')) {
        decrypted[key] = this.encryptionService.decrypt(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}