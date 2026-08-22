import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;

  // Mock AuthService so the controller unit tests
  // do not execute the real authentication business logic.
  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    // Create a NestJS testing module.
    // AuthController is real, while AuthService is replaced with a mock.
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    // Get the AuthController instance from the testing module.
    authController = module.get<AuthController>(AuthController);

    // Clear previous mock calls before every test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Register Controller Test
  // =========================================================

  it('should call AuthService.register with the request data', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Simulate the request body received by the controller.
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Jeremy',
    };

    // Fake result returned by AuthService.register().
    const mockRegisterResult = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Jeremy',
    };

    // Simulate successful registration from AuthService.
    authServiceMock.register.mockResolvedValue(mockRegisterResult);

    // -------------------------
    // Act
    // -------------------------

    // Call the real AuthController.register() method.
    const result = await authController.register(registerData);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the controller passed the correct request data
    // to AuthService.register().
    expect(authServiceMock.register).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      'Jeremy',
    );

    // Verify that AuthService.register() was called exactly once.
    expect(authServiceMock.register).toHaveBeenCalledTimes(1);

    // Verify that the controller returned
    // the result from AuthService.
    expect(result).toEqual(mockRegisterResult);
  });

  // =========================================================
  // Login Controller Test
  // =========================================================

  it('should call AuthService.login with email and password', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Simulate the login request body.
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Fake result returned by AuthService.login().
    const mockLoginResult = {
      accessToken: 'mock-jwt-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Jeremy',
      },
    };

    // Simulate successful login from AuthService.
    authServiceMock.login.mockResolvedValue(mockLoginResult);

    // -------------------------
    // Act
    // -------------------------

    // Call the real AuthController.login() method.
    const result = await authController.login(loginData);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the controller passed the correct email
    // and password to AuthService.login().
    expect(authServiceMock.login).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );

    // Verify that AuthService.login() was called exactly once.
    expect(authServiceMock.login).toHaveBeenCalledTimes(1);

    // Verify that the controller returned
    // the result from AuthService.
    expect(result).toEqual(mockLoginResult);
  });
});
