import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { loggerService } from '../logging/logger.service';

// 客户端连接信息
interface ClientConnection {
  socketId: string;
  tenantId: string;
  userId: string;
  subscribedLevels: string[];
  joinedAt: number;
}

// 日志推送网关类
export class LogGateway {
  private io: Server;
  private redisClient?: Redis;
  private enableRedis: boolean = false;
  private connections: Map<string, ClientConnection> = new Map();

  constructor(httpServer: HttpServer) {
    // 初始化 Socket.io
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // 初始化 Redis 客户端（用于发布/订阅日志）
    if (process.env.REDIS_URL) {
      this.initRedis();
    }

    // 设置连接处理
    this.setupConnectionHandling();
  }

  // 初始化 Redis
  private initRedis(): void {
    try {
      this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.enableRedis = true;
      loggerService.info('LogGateway Redis client initialized');
    } catch (error) {
      loggerService.error('Failed to initialize LogGateway Redis client', error as Error);
    }
  }

  // 设置连接处理
  private setupConnectionHandling(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  // 处理客户端连接
  private async handleConnection(socket: Socket): Promise<void> {
    try {
      // 1. 验证认证（从 JWT token）
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
      }

      // TODO: 验证 JWT token，提取 tenantId 和 userId
      // 临时实现：从 handshake 参数获取
      const tenantId = socket.handshake.query.tenantId as string || 'unknown';
      const userId = socket.handshake.query.userId as string || 'anonymous';

      // 2. 记录连接信息
      const connection: ClientConnection = {
        socketId: socket.id,
        tenantId,
        userId,
        subscribedLevels: ['info', 'warn', 'error'],
        joinedAt: Date.now(),
      };
      this.connections.set(socket.id, connection);

      loggerService.info(`Client connected: ${socket.id}`, { tenantId, userId });

      // 3. 发送欢迎消息
      socket.emit('connected', {
        message: 'Connected to log gateway',
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      // 4. 监听订阅级别变更
      socket.on('subscribe', (data: { levels: string[] }) => {
        const conn = this.connections.get(socket.id);
        if (conn) {
          conn.subscribedLevels = data.levels;
          this.connections.set(socket.id, conn);
          socket.emit('subscribed', { levels: data.levels });
        }
      });

      // 5. 监听断开连接
      socket.on('disconnect', () => {
        this.connections.delete(socket.id);
        loggerService.info(`Client disconnected: ${socket.id}`, { tenantId, userId });
      });

      // 6. 监听错误
      socket.on('error', (error: Error) => {
        loggerService.error(`Socket error: ${socket.id}`, error, { tenantId, userId });
      });
    } catch (error) {
      loggerService.error('Failed to handle connection', error as Error);
      socket.emit('error', { message: 'Connection failed' });
      socket.disconnect();
    }
  }

  // 推送日志到前端（多租户隔离）
  async pushLog(logEntry: any): Promise<void> {
    try {
      const { tenantId, level } = logEntry;

      // 1. 推送给订阅了该租户的客户端
      for (const [socketId, conn] of this.connections) {
        // 多租户隔离：只能看到自己租户的日志
        if (conn.tenantId !== tenantId && conn.tenantId !== 'global') {
          continue;
        }

        // 检查是否订阅了该级别的日志
        if (!conn.subscribedLevels.includes(level)) {
          continue;
        }

        // 推送日志
        this.io.to(socketId).emit('log', logEntry);
      }

      // 2. 同时发布到 Redis（用于其他实例订阅）
      if (this.enableRedis && this.redisClient) {
        const channel = `log:${tenantId}`;
        await this.redisClient.publish(channel, JSON.stringify(logEntry));
      }
    } catch (error) {
      console.error('Failed to push log:', error);
    }
  }

  // 广播系统告警（所有客户端都能收到）
  async broadcastAlert(alert: any): Promise<void> {
    try {
      this.io.emit('alert', alert);

      loggerService.info('Alert broadcasted', { alert });
    } catch (error) {
      loggerService.error('Failed to broadcast alert', error as Error);
    }
  }

  // 获取在线连接统计
  getConnectionStats(): {
    total: number;
    byTenant: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      byTenant: {} as Record<string, number>,
    };

    for (const conn of this.connections.values()) {
      stats.byTenant[conn.tenantId] = (stats.byTenant[conn.tenantId] || 0) + 1;
    }

    return stats;
  }

  // 关闭网关
  async close(): Promise<void> {
    // 1. 关闭所有连接
    for (const socketId of this.connections.keys()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect();
      }
    }
    this.connections.clear();

    // 2. 关闭 Socket.io 服务器
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });

    // 3. 关闭 Redis 客户端
    if (this.redisClient) {
      await this.redisClient.quit();
    }

    loggerService.info('LogGateway closed');
  }
}

// 创建网关实例（单例）
let logGatewayInstance: LogGateway | null = null;

export const createLogGateway = (httpServer: HttpServer): LogGateway => {
  if (!logGatewayInstance) {
    logGatewayInstance = new LogGateway(httpServer);
  }
  return logGatewayInstance;
};

export const getLogGateway = (): LogGateway | null => {
  return logGatewayInstance;
};

export default LogGateway;
