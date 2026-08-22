import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    // Inject AuthService so this controller can call authentication logic
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      name?: string;
    },
  ) {
    // Pass registration data to AuthService
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    // Pass login credentials to AuthService for verification
    return this.authService.login(body.email, body.password);
  }
}
