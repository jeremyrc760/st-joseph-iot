import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    // Inject JwtService so the guard can verify incoming JWT tokens
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Access the incoming HTTP request
    const request = context.switchToHttp().getRequest();

    // Read the Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // Reject the request if no Authorization header is provided
      throw new UnauthorizedException('Missing access token');
    }

    // Expected format: "Bearer <token>"
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      // Reject malformed Authorization headers
      throw new UnauthorizedException('Invalid access token');
    }

    try {
      // Verify the JWT signature and expiration time
      const payload = await this.jwtService.verifyAsync(token);

      // Attach the decoded JWT payload to the request
      request.user = payload;

      return true;
    } catch {
      // Reject expired or invalid JWT tokens
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}