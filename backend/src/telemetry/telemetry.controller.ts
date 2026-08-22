import { Controller, Get, UseGuards } from '@nestjs/common';

import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('telemetry')
export class TelemetryController {
  constructor(
    // Inject the telemetry service so the controller can call business logic
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  async getLatestTelemetry() {
    // Return the latest telemetry records from MongoDB
    return this.telemetryService.findLatest();
  }
}
