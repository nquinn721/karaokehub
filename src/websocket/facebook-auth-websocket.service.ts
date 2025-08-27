/**
 * WebSocket service for real-time Facebook authentication
 * Handles communication between Puppeteer and Admin UI
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface FacebookLoginRequest {
  email: string;
  password: string;
  requestId: string;
}

export interface FacebookLoginResponse {
  success: boolean;
  message: string;
  requestId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/facebook-auth',
})
@Injectable()
export class FacebookAuthWebSocketService {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FacebookAuthWebSocketService.name);
  private pendingRequests = new Map<string, (credentials: FacebookLoginRequest) => void>();

  /**
   * Request credentials from admin UI
   * Returns a promise that resolves when admin provides credentials
   */
  async requestCredentials(requestId: string): Promise<FacebookLoginRequest> {
    // Emit request to all connected admin clients
    this.server.emit('facebook-login-required', {
      requestId,
      message: 'Facebook login required. Please provide credentials.',
      timestamp: new Date().toISOString(),
    });

    // Return a promise that resolves when credentials are provided
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, resolve);

      // Timeout after 10 seconds (short timeout since we have cookie fallback)
      setTimeout(
        () => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            this.logger.warn(`⏰ Credential request timeout for ID: ${requestId}`);
            resolve(null);
          }
        },
        10 * 1000, // 10 seconds instead of 5 minutes
      );
    });
  }

  /**
   * Handle credentials provided by admin
   */
  @SubscribeMessage('provide-facebook-credentials')
  handleCredentials(@MessageBody() data: FacebookLoginRequest, @ConnectedSocket() client: Socket) {
    const resolver = this.pendingRequests.get(data.requestId);
    if (resolver) {
      this.pendingRequests.delete(data.requestId);
      resolver(data);

      // Notify client that credentials were received
      client.emit('credentials-received', {
        requestId: data.requestId,
        success: true,
        message: 'Credentials received, attempting login...',
      });
    } else {
      this.logger.warn(`⚠️ No pending request found for ID: ${data.requestId}`);
      client.emit('credentials-received', {
        requestId: data.requestId,
        success: false,
        message: 'Request expired or invalid',
      });
    }
  }

  /**
   * Notify admin UI of login result
   */
  notifyLoginResult(requestId: string, success: boolean, message: string) {
    this.server.emit('facebook-login-result', {
      requestId,
      success,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify admin UI of current status
   */
  notifyStatus(status: any) {
    this.server.emit('facebook-status-update', {
      ...status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client connections
   */
  handleConnection(client: Socket) {
    // Send current status to new client
    client.emit('connected', {
      message: 'Connected to Facebook Auth service',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket) {
    // Client disconnected - no action needed
  }
}
