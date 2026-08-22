import { JwtService } from '@nestjs/jwt';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    // Inject UsersService so AuthService can query and create users
    private readonly usersService: UsersService,

    // Inject JwtService so AuthService can generate JWT access tokens
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    // Check whether the email is already registered
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Hash the plaintext password before storing it in MongoDB
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user with the hashed password
    const user = await this.usersService.createUser(
      email,
      hashedPassword,
      name,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async login(email: string, password: string) {
    // Find the user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Use a generic error message so we do not reveal whether the email exists
      throw new BadRequestException('Invalid email or password');
    }

    // Compare the plaintext password with the stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Reject login if the password does not match
      throw new BadRequestException('Invalid email or password');
    }

    // Define the data that will be stored inside the JWT payload
    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    // Generate a signed JWT access token
    const accessToken = await this.jwtService.signAsync(payload);

    // Return the token and basic user information to the client
    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
