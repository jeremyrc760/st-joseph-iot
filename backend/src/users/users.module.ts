import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersService } from './users.service';
import { User, UserSchema } from './user.schema';

@Module({
  imports: [
    // Register the User Mongoose model for this module
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  // Register the UsersService so NestJS can inject and use it
  providers: [UsersService],

  // Export UsersService so AuthModule can use it later
  exports: [UsersService],
})
export class UsersModule {}
