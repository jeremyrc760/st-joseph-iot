import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TelemetryGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    // Inject JwtService so the gateway can verify WebSocket access tokens
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(
    @ConnectedSocket() client: Socket,
  ) {
    // Read the JWT token from the Socket.IO authentication payload
    const token = client.handshake.auth?.token;

    if (!token) {
      // Disconnect clients that do not provide an access token
      client.disconnect();
      return;
    }

    try {
      // Verify the JWT signature and expiration
      const payload = await this.jwtService.verifyAsync(token);

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