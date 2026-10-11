import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, NotificationDto } from '@cloudlab/shared-types';

interface AuthenticatedClient {
  userId: string;
  ws: WebSocket;
}

export class NotificationSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedClient> = new Set();

  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws/notifications' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let userId: string | null = null;

      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (token) {
          const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
          userId = decoded.sub;
        }
      } catch (err: any) {
        console.warn('⚠️ [WS] Connection authentication failed:', err.message);
      }

      if (!userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication required for WebSocket connection' }));
        ws.close(4001, 'Unauthorized');
        return;
      }

      const clientObj: AuthenticatedClient = { userId, ws };
      this.clients.add(clientObj);

      ws.send(JSON.stringify({ type: 'connected', message: 'Real-time notifications connected' }));

      ws.on('close', () => {
        this.clients.delete(clientObj);
      });

      ws.on('error', (err) => {
        console.error('⚠️ [WS Error]:', err.message);
        this.clients.delete(clientObj);
      });
    });

    console.log('📡 [WebSocket] Notification WebSocket server initialized on /ws/notifications');
  }

  sendToUser(userId: string, notification: NotificationDto): void {
    const messageStr = JSON.stringify({ type: 'notification', notification });
    for (const client of this.clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  broadcast(notification: NotificationDto): void {
    const messageStr = JSON.stringify({ type: 'notification', notification });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }
}

export const notificationSocketServer = new NotificationSocketServer();
