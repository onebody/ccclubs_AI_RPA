import { Injectable } from '@nestjs/common';

export interface ExecuteScriptRequest {
  sessionId: string;
  script: string;
}

export interface ExecuteScriptResponse {
  status: 'success' | 'failed';
  output: string;
  error?: string;
}

@Injectable()
export class ScriptService {
  async executeScript(request: ExecuteScriptRequest): Promise<ExecuteScriptResponse> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        status: 'success',
        output: '脚本执行完成',
      };
    } catch (error) {
      return {
        status: 'failed',
        output: '',
        error: error.message,
      };
    }
  }

  async getScriptResult(sessionId: string, requestId: string) {
    return {
      sessionId,
      requestId,
      status: 'completed',
      data: {},
    };
  }
}