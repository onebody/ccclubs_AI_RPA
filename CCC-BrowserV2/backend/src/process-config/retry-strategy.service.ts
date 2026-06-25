import { Injectable, Logger } from '@nestjs/common';

export type RetryStrategyType = 'fixed' | 'exponential' | 'linear';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  strategy: RetryStrategyType;
  maxDelay?: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  strategy: 'exponential',
  maxDelay: 30000,
};

@Injectable()
export class RetryStrategyService {
  private readonly logger = new Logger(RetryStrategyService.name);

  private calculateDelay(config: RetryConfig, attempt: number): number {
    switch (config.strategy) {
      case 'fixed':
        return config.initialDelay;
      case 'linear':
        return config.initialDelay * attempt;
      case 'exponential':
      default:
        const delay = config.initialDelay * Math.pow(2, attempt - 1);
        return config.maxDelay ? Math.min(delay, config.maxDelay) : delay;
    }
  }

  async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void,
  ): Promise<T> {
    const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt}/${retryConfig.maxRetries} failed: ${lastError.message}`);

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateDelay(retryConfig, attempt);
          this.logger.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`All ${retryConfig.maxRetries} retries failed: ${lastError?.message}`);
    throw lastError || new Error('Retry failed');
  }

  async executeWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    initialDelay: number,
  ): Promise<T> {
    return this.execute(fn, {
      maxRetries,
      initialDelay,
      strategy: 'exponential',
    });
  }

  async executeWithJitter<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < retryConfig.maxRetries) {
          const baseDelay = this.calculateDelay(retryConfig, attempt);
          const jitter = Math.random() * baseDelay * 0.1;
          const delay = baseDelay + jitter;
          this.logger.log(`Waiting ${Math.round(delay)}ms (with jitter) before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry with jitter failed');
  }

  getRemainingAttempts(currentAttempt: number, maxAttempts: number): number {
    return Math.max(0, maxAttempts - currentAttempt);
  }
}