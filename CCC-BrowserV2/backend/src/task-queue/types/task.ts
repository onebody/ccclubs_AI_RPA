export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface TaskPayload {
  taskId: string;
  tenantId: string;
  processId: string;
  sceneId?: string;
  apiSourceId?: string;
  userDataList: Record<string, any>[];
  sessionId?: string;
  maxRetries?: number;
}

export interface TaskOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface TaskResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  progress: number;
  currentStep: string;
  message?: string;
}