import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { User, UserSchema } from '../src/users/user.schema';

// Give MongoDB Memory Server enough time to start.
jest.setTimeout(30000);

describe('Auth E2E', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start a temporary MongoDB instance for E2E testing.
    // This database exists only during the test.
    mongoServer = await MongoMemoryServer.create();

    // Get the temporary MongoDB connection URI.
    const mongoUri = mongoServer.getUri();

    // Create a real NestJS testing application.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Connect Mongoose to the temporary MongoDB database.
        MongooseModule.forRoot(mongoUri),

        // Register the real User schema.
        MongooseModule.forFeature([
          {
            name: User.name,
            schema: UserSchema,
          },
        ]),

        // Use a real JwtService.
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: {
            expiresIn: '1h',
          },
        }),
      ],

      // Use the real AuthController.
      controllers: [AuthController],

      // Use the real AuthService and UsersService.
      providers: [AuthService, UsersService],
    }).compile();

    // Create the NestJS application.
    app = moduleFixture.createNestApplication();

    // Initialize the application.
    await app.init();
  });

  afterAll(async () => {
    // Close the NestJS application after all tests finish.
    await app.close();

    // Stop and remove the temporary MongoDB instance.
    await mongoServer.stop();
  });

  // =========================================================
  // Register E2E Test
  // =========================================================

  it('POST /auth/register should register a new user', async () => {
    // Send a real HTTP POST request to the NestJS application.
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Jeremy',
      })
      .expect(201);

    // Verify that the response contains
    // the registered user's public information.
    expect(response.body).toEqual(
      expect.objectContaining({
        email: 'test@example.com',
        name: 'Jeremy',
      }),
    );

    // The hashed password must never be returned to the client.
    expect(response.body.password).toBeUndefined();
  });

  // =========================================================
  // Login E2E Test
  // =========================================================

  it('POST /auth/login should login a registered user', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Register a user first so this test is independent
    // from other test cases.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'login@example.com',
        password: 'password123',
        name: 'Login User',
      })
      .expect(201);

    // -------------------------
    // Act
    // -------------------------

    // Send a real HTTP login request using
    // the credentials created above.
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      })
      .expect(201);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that a JWT access token was returned.
    expect(response.body.accessToken).toBeDefined();

    // Verify that the access token is a string.
    expect(typeof response.body.accessToken).toBe('string');

    // Verify the authenticated user's public information.
    expect(response.body.user).toEqual(
      expect.objectContaining({
        email: 'login@example.com',
        name: 'Login User',
      }),
    );

    // The password must never be returned to the client.
    expect(response.body.user.password).toBeUndefined();
  });

  // =========================================================
  // Login Failure E2E Test - Invalid Password
  // =========================================================

  it('POST /auth/login should reject an invalid password', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Register a user first so this test has its own test data.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'wrongpassword@example.com',
        password: 'password123',
        name: 'Wrong Password User',
      })
      .expect(201);

    // -------------------------
    // Act
    // -------------------------

    // Attempt to login with the correct email
    // but an incorrect password.
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'wrongpassword@example.com',
        password: 'wrong-password',
      })
      .expect(400);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the API returns the generic
    // authentication error message.
    expect(response.body.message).toBe('Invalid email or password');

    // Verify that NestJS returned a Bad Request response.
    expect(response.body.statusCode).toBe(400);
  });

  // =========================================================
  // Register Failure E2E Test - Duplicate Email
  // =========================================================

  it('POST /auth/register should reject a duplicate email', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    const userData = {
      email: 'duplicate@example.com',
      password: 'password123',
      name: 'Duplicate User',
    };

    // Register the user for the first time.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData)
      .expect(201);

    // -------------------------
    // Act
    // -------------------------

    // Attempt to register the same email again.
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData)
      .expect(400);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the API returns the duplicate email error.
    expect(response.body.message).toBe('Email is already registered');

    // Verify the HTTP status code.
    expect(response.body.statusCode).toBe(400);
  });
});
