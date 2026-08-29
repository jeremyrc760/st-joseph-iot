import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

type JwtPayload = Record<string, unknown>;

type AuthenticatedSocket = Omit<Socket, 'data'> & {
  data: {
    user?: JwtPayload;
  };
};

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
  },
})
export class TelemetryGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    // Inject JwtService so the gateway can verify WebSocket access tokens
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    // Socket.IO authentication data comes from an external client,
    // so treat it as unknown until its type is validated.
    const auth = client.handshake.auth as Record<string, unknown>;
    const token = auth.token;

    if (typeof token !== 'string' || token.length === 0) {
      // Disconnect clients that do not provide a valid string token.
      client.disconnect();
      return;
    }

    try {
      // Verify the JWT signature and expiration
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Attach authenticated user information to the socket connection
      client.data.user = payload;
    } catch {
      // Disconnect clients with invalid or expired tokens
      client.disconnect();
    }
  }

  emitTelemetry(data: unknown) {
    // Push realtime telemetry to all authenticated WebSocket clients
    this.server.emit('telemetry', data);
  }
}
