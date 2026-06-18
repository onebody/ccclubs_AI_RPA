import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getTenantStats(tenantId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [activeSessions, todayTasks] = await Promise.all([
      this.prisma.browserSession.count({
        where: { tenantId, status: 'running' },
      }),
      this.prisma.taskRecord.count({
        where: {
          session: { tenantId },
          createdAt: { gte: startOfDay },
        },
      }),
    ]);

    return {
      activeSessions,
      todayTasks,
      totalStorage: 0,
    };
  }

  async getGlobalStats() {
    const [totalTenants, activeSessions, totalTasks] = await Promise.all([
      this.prisma.tenant.count({ where: { enabled: true } }),
      this.prisma.browserSession.count({ where: { status: 'running' } }),
      this.prisma.taskRecord.count(),
    ]);

    return {
      totalTenants,
      activeSessions,
      totalTasks,
    };
  }

  async getSessionMetrics(sessionId: string) {
    const session = await this.prisma.browserSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return null;
    }

    const tasks = await this.prisma.taskRecord.findMany({
      where: { sessionId },
    });

    const successRate = tasks.length > 0
      ? tasks.filter(t => t.status === 'success').length / tasks.length * 100
      : 0;

    return {
      sessionId,
      startTime: session.startTime,
      status: session.status,
      totalTasks: tasks.length,
      successRate: `${successRate.toFixed(1)}%`,
    };
  }
}