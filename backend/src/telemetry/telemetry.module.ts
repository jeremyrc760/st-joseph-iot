import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryService } from './telemetry.service';
import { Telemetry, TelemetrySchema } from './telemetry.schema';

@Module({
  imports: [
    // Import AuthModule so JwtAuthGuard can access JwtService
    AuthModule,

    // Register the Telemetry Mongoose model for this module
    MongooseModule.forFeature([
      {
        name: Telemetry.name,
        schema: TelemetrySchema,
      },
    ]),
  ],

  // Register REST API endpoints for telemetry
  controllers: [TelemetryController],

  // Register telemetry business logic and WebSocket gateway
  providers: [TelemetryService, TelemetryGateway],
})
export class TelemetryModule {}
