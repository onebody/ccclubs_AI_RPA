import { Injectable } from '@nestjs/common';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
  error: string;
  timestamp: number;
}

@Injectable()
export class ResponseService {
  /**
   * 成功响应
   */
  success<T>(data: T, message: string = 'success'): ApiResponse<T> {
    return {
      code: 200,
      message,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 错误响应
   */
  error(message: string, error: string, code: number = 400): ApiErrorResponse {
    return {
      code,
      message,
      error,
      timestamp: Date.now(),
    };
  }

  /**
   * 分页响应
   */
  paginate<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message: string = 'success',
  ): ApiResponse<{ list: T[]; total: number; page: number; pageSize: number }> {
    return {
      code: 200,
      message,
      data: {
        list: data,
        total,
        page,
        pageSize,
      },
      timestamp: Date.now(),
    };
  }
}