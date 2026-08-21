import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelemetryDocument = HydratedDocument<Telemetry>;

@Schema()
export class Telemetry {
  @Prop({ required: true })
  deviceId!: string;

  @Prop({ required: true })
  timestamp!: string;

  @Prop({ type: Object, required: true })
  imu!: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  load!: Record<string, unknown>;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);