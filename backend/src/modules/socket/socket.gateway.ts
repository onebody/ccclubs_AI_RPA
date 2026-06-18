import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';

interface ClientInfo {
  userId: string;
  tenantId: string;
  sessionId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS || '*',
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients: Map<string, ClientInfo> = new Map();

  constructor(private authService: AuthService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.authService.verifyToken(token);
      this.clients.set(client.id, {
        userId: payload.userId,
        tenantId: payload.tenantId,
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { sessionId: string }) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) return;

    clientInfo.sessionId = payload.sessionId;
    client.join(payload.sessionId);

    return { status: 'subscribed', sessionId: payload.sessionId };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo?.sessionId) {
      client.leave(clientInfo.sessionId);
      clientInfo.sessionId = undefined;
    }

    return { status: 'unsubscribed' };
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { sessionId: string; type: string; data: any }) {
    client.to(payload.sessionId).emit('message', payload);
    return { status: 'ok' };
  }

  sendToSession(sessionId: string, event: string, data: any) {
    this.server.to(sessionId).emit(event, data);
  }
}