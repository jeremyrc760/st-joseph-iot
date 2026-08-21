import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  // Mock JwtService so the unit test does not verify a real JWT.
  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  beforeEach(() => {
    // Create the real JwtAuthGuard with a mocked JwtService.
    guard = new JwtAuthGuard(
      jwtServiceMock as unknown as JwtService,
    );

    // Clear previous mock calls before each test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Valid Token Test
  // =========================================================

  it('should allow access with a valid Bearer token', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake decoded JWT payload.
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
    };

    // Fake HTTP request containing a valid Authorization header.
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
      user: undefined,
    };

    // Mock NestJS ExecutionContext.
    // The guard will call:
    // context.switchToHttp().getRequest()
    const context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    // Simulate successful JWT verification.
    jwtServiceMock.verifyAsync.mockResolvedValue(
      mockPayload,
    );

    // -------------------------
    // Act
    // -------------------------

    // Call the real canActivate() method.
    const result = await guard.canActivate(context);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that JwtService received the token
    // without the "Bearer" prefix.
    expect(
      jwtServiceMock.verifyAsync,
    ).toHaveBeenCalledWith('valid-token');

    // Verify that the guard allows the request.
    expect(result).toBe(true);

    // Verify that the decoded JWT payload
    // was attached to request.user.
    expect(request.user).toEqual(mockPayload);
  });

  it('should reject request when access token is missing', async () => {
  // -------------------------
  // Arrange
  // -------------------------

  // Fake HTTP request without an Authorization header.
  const request = {
    headers: {},
  };

  // Mock NestJS ExecutionContext.
  const context = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;

  // -------------------------
  // Act + Assert
  // -------------------------

  // Verify that the guard rejects the request
  // when no access token is provided.
  await expect(
    guard.canActivate(context),
  ).rejects.toThrow('Missing access token');

  // JWT verification should never run
  // because there is no token to verify.
  expect(
    jwtServiceMock.verifyAsync,
  ).not.toHaveBeenCalled();
});

it('should reject request with malformed Authorization header', async () => {
  // -------------------------
  // Arrange
  // -------------------------

  // Fake HTTP request with an invalid Authorization header format.
  const request = {
    headers: {
      authorization: 'Basic invalid-token',
    },
  };

  // Mock NestJS ExecutionContext.
  const context = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;

  // -------------------------
  // Act + Assert
  // -------------------------

  // Verify that the guard rejects an Authorization header
  // that does not use the Bearer token format.
  await expect(
    guard.canActivate(context),
  ).rejects.toThrow('Invalid access token');

  // JWT verification should not run because
  // the Authorization header format is invalid.
  expect(
    jwtServiceMock.verifyAsync,
  ).not.toHaveBeenCalled();
});

// =========================================================
// Invalid or Expired JWT Test
// =========================================================

it('should reject request when JWT is invalid or expired', async () => {
  // -------------------------
  // Arrange
  // -------------------------

  // Fake HTTP request with a correctly formatted Bearer token.
  const request = {
    headers: {
      authorization: 'Bearer invalid-token',
    },
  };

  // Mock NestJS ExecutionContext.
  const context = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;

  // Simulate JWT verification failure.
  // This could represent an invalid signature or an expired token.
  jwtServiceMock.verifyAsync.mockRejectedValue(
    new Error('Invalid or expired JWT'),
  );

  // -------------------------
  // Act + Assert
  // -------------------------

  // Verify that the guard rejects the request
  // when JWT verification fails.
  await expect(
    guard.canActivate(context),
  ).rejects.toThrow(
    'Invalid or expired access token',
  );

  // Verify that JwtService attempted to verify
  // the token extracted from the Authorization header.
  expect(
    jwtServiceMock.verifyAsync,
  ).toHaveBeenCalledWith('invalid-token');

  // Verify that JWT verification was attempted exactly once.
  expect(
    jwtServiceMock.verifyAsync,
  ).toHaveBeenCalledTimes(1);
});
});