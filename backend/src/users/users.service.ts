import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    // Inject the User Mongoose model so this service can query MongoDB
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async findByEmail(email: string) {
    // Find one user document whose email matches the provided email
    return this.userModel.findOne({ email }).exec();
  }

  async createUser(email: string, password: string, name?: string) {
    // Create a new user document in MongoDB
    return this.userModel.create({
      email,
      password,
      name,
    });
  }
}
