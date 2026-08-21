import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock the entire bcrypt module.
// This prevents the unit tests from performing real password hashing
// or password comparison.
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  // Mock UsersService so the tests do not access the real MongoDB database.
  const usersServiceMock = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  // Mock JwtService so the tests do not generate real JWT tokens.
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    // Create a NestJS testing module.
    // AuthService is real, while its dependencies are replaced with mocks.
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AuthService,

          // Replace the real UsersService with a mock.
          {
            provide: UsersService,
            useValue: usersServiceMock,
          },

          // Replace the real JwtService with a mock.
          {
            provide: JwtService,
            useValue: jwtServiceMock,
          },
        ],
      }).compile();

    // Get the AuthService instance from the testing module.
    authService = module.get<AuthService>(AuthService);

    // Clear all mock call history before every test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Register - Success Test
  // =========================================================

  it('should register a new user successfully', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake user returned after successful user creation.
    const mockCreatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Jeremy',
    };

    // Simulate that no user with this email already exists.
    usersServiceMock.findByEmail.mockResolvedValue(null);

    // Simulate successful user creation.
    usersServiceMock.createUser.mockResolvedValue(
      mockCreatedUser,
    );

    // Simulate bcrypt hashing the plaintext password.
    (bcrypt.hash as jest.Mock).mockResolvedValue(
      'hashed-password',
    );

    // -------------------------
    // Act
    // -------------------------

    // Call the real AuthService.register() method.
    const result = await authService.register(
      'test@example.com',
      'password123',
      'Jeremy',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that AuthService checked whether the email exists.
    expect(
      usersServiceMock.findByEmail,
    ).toHaveBeenCalledWith(
      'test@example.com',
    );

    // Verify that bcrypt.hash() received the plaintext password
    // and 10 salt rounds.
    expect(bcrypt.hash).toHaveBeenCalledWith(
      'password123',
      10,
    );

    // Verify that createUser() received the correct data.
    expect(
      usersServiceMock.createUser,
    ).toHaveBeenCalledWith(
      'test@example.com',
      'hashed-password',
      'Jeremy',
    );

    // Verify the final result returned by register().
    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Jeremy',
    });
  });

  // =========================================================
  // Register - Failure Test
  // =========================================================

  it('should throw an error if email is already registered', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake existing user returned from the database.
    const existingUser = {
      id: 'existing-user-123',
      email: 'test@example.com',
      name: 'Existing User',
    };

    // Simulate that a user with this email already exists.
    usersServiceMock.findByEmail.mockResolvedValue(
      existingUser,
    );

    // -------------------------
    // Act
    // -------------------------

    // Store the rejected promise so register() is only called once.
    const registerPromise = authService.register(
      'test@example.com',
      'password123',
      'Jeremy',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that register() throws the expected exception.
    await expect(registerPromise).rejects.toThrow(
      new BadRequestException(
        'Email is already registered',
      ),
    );

    // Verify that AuthService checked the email.
    expect(
      usersServiceMock.findByEmail,
    ).toHaveBeenCalledWith(
      'test@example.com',
    );

    // Password hashing should not happen after detecting
    // that the email is already registered.
    expect(bcrypt.hash).not.toHaveBeenCalled();

    // A new user should not be created.
    expect(
      usersServiceMock.createUser,
    ).not.toHaveBeenCalled();
  });

  // =========================================================
  // Login - Success Test
  // =========================================================

  it('should login a user successfully', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake user that would normally come from MongoDB.
    const mockUser = {
      _id: {
        toString: () => 'user-123',
      },
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Jeremy',
    };

    // Simulate finding the user by email.
    usersServiceMock.findByEmail.mockResolvedValue(
      mockUser,
    );

    // Simulate successful password validation.
    (bcrypt.compare as jest.Mock).mockResolvedValue(
      true,
    );

    // Simulate JWT generation.
    jwtServiceMock.signAsync.mockResolvedValue(
      'mock-jwt-token',
    );

    // -------------------------
    // Act
    // -------------------------

    // Call the real AuthService.login() method.
    const result = await authService.login(
      'test@example.com',
      'password123',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that AuthService searched for the user by email.
    expect(
      usersServiceMock.findByEmail,
    ).toHaveBeenCalledWith(
      'test@example.com',
    );

    // Verify that bcrypt.compare() received the plaintext password
    // and the stored hashed password.
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123',
      'hashed-password',
    );

    // Verify that JwtService received the correct JWT payload.
    expect(
      jwtServiceMock.signAsync,
    ).toHaveBeenCalledWith({
      sub: 'user-123',
      email: 'test@example.com',
    });

    // Verify the final result returned by login().
    expect(result).toEqual({
      accessToken: 'mock-jwt-token',
      user: {
        id: mockUser._id,
        email: 'test@example.com',
        name: 'Jeremy',
      },
    });
  });

  // =========================================================
  // Login - Failure Test: Invalid Password
  // =========================================================

  it('should throw an error if password is invalid', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake user returned from the database.
    const mockUser = {
      _id: {
        toString: () => 'user-123',
      },
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Jeremy',
    };

    // Simulate finding the user successfully.
    usersServiceMock.findByEmail.mockResolvedValue(
      mockUser,
    );

    // Simulate an incorrect password.
    (bcrypt.compare as jest.Mock).mockResolvedValue(
      false,
    );

    // -------------------------
    // Act
    // -------------------------

    // Store the rejected promise so login() is only called once.
    const loginPromise = authService.login(
      'test@example.com',
      'wrong-password',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that login() throws the expected exception.
    await expect(loginPromise).rejects.toThrow(
      new BadRequestException(
        'Invalid email or password',
      ),
    );

    // Verify that the user was searched by email.
    expect(
      usersServiceMock.findByEmail,
    ).toHaveBeenCalledWith(
      'test@example.com',
    );

    // Verify that the plaintext password was compared
    // with the stored hashed password.
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'wrong-password',
      'hashed-password',
    );

    // JWT generation should not happen after password validation fails.
    expect(
      jwtServiceMock.signAsync,
    ).not.toHaveBeenCalled();
  });

  // =========================================================
  // Login - Failure Test: User Not Found
  // =========================================================

  it('should throw an error if user is not found', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Simulate that no user exists with the provided email.
    usersServiceMock.findByEmail.mockResolvedValue(null);

    // -------------------------
    // Act
    // -------------------------

    // Call login() with an email that does not exist.
    const loginPromise = authService.login(
      'missing@example.com',
      'password123',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that login() throws the expected exception.
    await expect(loginPromise).rejects.toThrow(
      new BadRequestException(
        'Invalid email or password',
      ),
    );

    // Verify that AuthService searched for the user by email.
    expect(
      usersServiceMock.findByEmail,
    ).toHaveBeenCalledWith(
      'missing@example.com',
    );

    // bcrypt.compare() should never run because no user was found.
    expect(bcrypt.compare).not.toHaveBeenCalled();

    // JWT generation should never happen because authentication failed.
    expect(
      jwtServiceMock.signAsync,
    ).not.toHaveBeenCalled();
  });
});