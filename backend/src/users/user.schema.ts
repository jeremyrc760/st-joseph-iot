import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  // User email will be used as the login identifier
  @Prop({ required: true, unique: true })
  email!: string;

  // Store only the hashed password, never the plaintext password
  @Prop({ required: true })
  password!: string;

  // Optional display name for the user
  @Prop()
  name?: string;
}

// Generate the Mongoose schema from the User class
export const UserSchema = SchemaFactory.createForClass(User);
