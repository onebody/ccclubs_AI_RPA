import { loggerService } from '../logging/logger.service';
import { metricsService, Metrics } from '../monitoring/metrics.service';

// 告警规则接口
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  duration: number; // 持续时间（秒）
  tenantId?: string; // 租户 ID（空表示全局规则）
  enabled: boolean;
  channels: AlertChannel[];
}

// 告警渠道接口
export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, any>;
}

// 告警接口
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  tenantId?: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  status: 'active' | 'resolved';
  resolvedAt?: string;
}

// 告警服务类
export class AlertService {
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    // 加载默认告警规则
    this.loadDefaultRules();
  }

  // 加载默认告警规则
  private loadDefaultRules(): void {
    this.rules = [
      {
        id: 'rule-001',
        name: '高错误率告警',
        description: '错误率超过 5%',
        metric: 'errorRate',
        condition: 'gt',
        threshold: 5,
        duration: 300, // 持续 5 分钟
        enabled: true,
        channels: [
          { type: 'webhook', config: { url: process.env.WEBHOOK_URL || '' } },
        ],
      },
      {
        id: 'rule-002',
        name: '高响应时间告警',
        description: '平均响应时间超过 1000ms',
        metric: 'reqDurationAvg',
        condition: 'gt',
        threshold: 1000,
        duration: 300,
        enabled: true,
        channels: [
          { type: 'webhook', config: { url: process.env.WEBHOOK_URL || '' } },
        ],
      },
      {
        id: 'rule-003',
        name: '存储空间不足告警',
        description: '内存使用超过 90%',
        metric: 'memoryUsage',
        condition: 'gt',
        threshold: 90,
        duration: 60,
        enabled: true,
        channels: [
          { type: 'webhook', config: { url: process.env.WEBHOOK_URL || '' } },
        ],
      },
    ];

    loggerService.info(`Loaded ${this.rules.length} default alert rules`);
  }

  // 添加告警规则
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    loggerService.info(`Added alert rule: ${rule.name}`, { ruleId: rule.id });
  }

  // 删除告警规则
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      loggerService.info(`Removed alert rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  // 获取所有告警规则
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  // 启动告警检查（定期执行）
  startChecking(interval: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.checkAlerts();
    }, interval);

    loggerService.info(`Alert checking started (interval: ${interval}ms)`);
  }

  // 停止告警检查
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      loggerService.info('Alert checking stopped');
    }
  }

  // 检查告警
  async checkAlerts(metrics?: Metrics): Promise<void> {
    try {
      // 如果没有传入 metrics，则获取全局指标
      if (!metrics) {
        metrics = await metricsService.getMetrics();
      }

      // 遍历所有启用的规则
      for (const rule of this.rules) {
        if (!rule.enabled) {
          continue;
        }

        // 检查租户匹配
        if (rule.tenantId && rule.tenantId !== metrics.tenantId) {
          continue;
        }

        // 获取指标值
        const metricValue = (metrics as any)[rule.metric];
        if (metricValue === undefined) {
          loggerService.warn(`Metric ${rule.metric} not found in metrics`);
          continue;
        }

        // 检查条件
        const isTriggered = this.evaluateCondition(
          metricValue,
          rule.condition,
          rule.threshold
        );

        // 生成告警 ID
        const alertId = `${rule.id}:${metrics.tenantId || 'global'}`;

        if (isTriggered) {
          // 告警触发
          if (!this.activeAlerts.has(alertId)) {
            const alert: Alert = {
              id: alertId,
              ruleId: rule.id,
              ruleName: rule.name,
              tenantId: metrics.tenantId,
              metric: rule.metric,
              value: metricValue,
              threshold: rule.threshold,
              message: `${rule.name}: ${rule.metric} = ${metricValue} ${rule.condition} ${rule.threshold}`,
              severity: this.getSeverity(rule.threshold),
              timestamp: new Date().toISOString(),
              status: 'active',
            };

            this.activeAlerts.set(alertId, alert);
            await this.sendAlert(alert, rule.channels);
            loggerService.warn(`Alert triggered: ${alert.message}`, { alert });
          }
        } else {
          // 告警恢复
          if (this.activeAlerts.has(alertId)) {
            const alert = this.activeAlerts.get(alertId)!;
            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
            await this.sendAlert(alert, rule.channels);
            this.activeAlerts.delete(alertId);
            loggerService.info(`Alert resolved: ${alert.message}`, { alert });
          }
        }
      }
    } catch (error) {
      loggerService.error('Failed to check alerts', error as Error);
    }
  }

  // 评估条件
  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  // 获取告警严重级别
  private getSeverity(threshold: number): 'info' | 'warning' | 'error' | 'critical' {
    if (threshold >= 90) {
      return 'critical';
    } else if (threshold >= 70) {
      return 'error';
    } else if (threshold >= 50) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  // 发送告警
  async sendAlert(alert: Alert, channels: AlertChannel[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, channel.config);
            break;
        }
      } catch (error) {
        loggerService.error(`Failed to send alert via ${channel.type}`, error as Error);
      }
    }
  }

  // 发送 Email 告警
  private async sendEmailAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // TODO: 实现 Email 发送（使用 nodemailer）
    loggerService.info(`Email alert would be sent: ${alert.message}`, { config });
  }

  // 发送 Webhook 告警
  private async sendWebhookAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.url) {
      loggerService.warn('Webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook response: ${response.status}`);
      }

      loggerService.info(`Webhook alert sent: ${alert.message}`, { url: config.url });
    } catch (error) {
      loggerService.error('Failed to send webhook alert', error as Error);
    }
  }

  // 发送 Slack 告警
  private async sendSlackAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.webhookUrl) {
      loggerService.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const slackMessage = {
        text: `🚨 *${alert.ruleName}*`,
        attachments: [
          {
            color: alert.severity === 'critical' ? '#ff0000' : '#ffa500',
            fields: [
              { title: 'Metric', value: alert.metric, short: true },
              { title: 'Value', value: `${alert.value}`, short: true },
              { title: 'Threshold', value: `${alert.threshold}`, short: true },
              { title: 'Tenant', value: alert.tenantId || 'global', short: true },
              { title: 'Message', value: alert.message, short: false },
            ],
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack response: ${response.status}`);
      }

      loggerService.info(`Slack alert sent: ${alert.message}`);
    } catch (error) {
      loggerService.error('Failed to send Slack alert', error as Error);
    }
  }

  // 获取活跃告警
  getActiveAlerts(tenantId?: string): Alert[] {
    const alerts = Array.from(this.activeAlerts.values());
    if (tenantId) {
      return alerts.filter((a) => a.tenantId === tenantId || !a.tenantId);
    }
    return alerts;
  }

  // 关闭服务
  close(): void {
    this.stopChecking();
    this.activeAlerts.clear();
    loggerService.info('AlertService closed');
  }
}

// 导出单例实例
export const alertService = new AlertService();

export default alertService;
