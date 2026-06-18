import app from './app';
import config from './config/index';
import { loggerService } from './logging/logger.service';
import { createLogGateway } from './websocket/log.gateway';
import { alertService } from './alert/alert.service';
import { metricsService } from './monitoring/metrics.service';

// 启动服务器
const server = app.listen(config.port, config.host, () => {
  loggerService.info(`=================================`);
  loggerService.info(`🚀 Server is running`);
  loggerService.info(`📍 Environment: ${config.env}`);
  loggerService.info(`🌐 Host: ${config.host}`);
  loggerService.info(`🔌 Port: ${config.port}`);
  loggerService.info(`📡 API: ${config.api.prefix}/${config.api.version}`);
  
  // 初始化 WebSocket 网关（用于实时日志推送）
  const logGateway = createLogGateway(server);
  loggerService.info('✅ Log gateway initialized');
  
  // 启动告警检查（每 60 秒检查一次）
  alertService.startChecking(60000);
  loggerService.info('✅ Alert service started');
  
  loggerService.info(`=================================`);
});

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  loggerService.info(`Received ${signal}, shutting down gracefully...`);
  
  // 1. 停止告警检查
  alertService.stopChecking();
  loggerService.info('Alert service stopped');
  
  // 2. 关闭日志网关
  const logGateway = getLogGateway();
  if (logGateway) {
    await logGateway.close();
    loggerService.info('Log gateway closed');
  }
  
  // 3. 关闭指标服务
  await metricsService.close();
  loggerService.info('Metrics service closed');
  
  // 4. 关闭 HTTP 服务器
  server.close(() => {
    loggerService.info('HTTP server closed');
    
    // 5. 关闭日志服务
    loggerService.close();
    
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    loggerService.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 监听终止信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error: Error) => {
  loggerService.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  loggerService.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export default server;

// 导入 getLogGateway（需要在文件末尾导入以避免循环依赖）
import { getLogGateway } from './websocket/log.gateway';
