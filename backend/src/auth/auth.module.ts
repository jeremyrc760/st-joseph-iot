import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // Import UsersModule so AuthService can access UsersService
    UsersModule,

    // Register JwtModule using values from environment variables
    JwtModule.registerAsync({
      imports: [ConfigModule],

      // Inject ConfigService into the factory function
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        // Read JWT secret from backend/.env
        secret: configService.get<string>('JWT_SECRET'),

        // Set access token expiration time
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
  ],

  // Register authentication REST endpoints
  controllers: [AuthController],

  // Register authentication business logic
  providers: [AuthService],

  // Export JWTModule so other modules can use JWTService
  exports: [JwtModule],
})
export class AuthModule {}