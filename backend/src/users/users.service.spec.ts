import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { UsersService } from './users.service';
import { User } from './user.schema';

describe('UsersService', () => {
  let usersService: UsersService;

  // Mock the Mongoose User model so the unit tests
  // do not connect to the real MongoDB database.
  const userModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    // Create a NestJS testing module.
    // UsersService is real, while the Mongoose User model
    // is replaced with a mock object.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,

        // Provide a mocked Mongoose model using
        // the same injection token used by @InjectModel(User.name).
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
      ],
    }).compile();

    // Get the real UsersService instance from the testing module.
    usersService = module.get<UsersService>(UsersService);

    // Clear previous mock calls before each test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Service Creation Test
  // =========================================================

  it('should be defined', () => {
    // Verify that NestJS successfully created UsersService.
    expect(usersService).toBeDefined();
  });

  // =========================================================
  // findByEmail Test
  // =========================================================

  it('should find a user by email', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake user that would normally come from MongoDB.
    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Jeremy',
    };

    // Mock the exec() method returned by Mongoose findOne().
    const execMock = jest.fn().mockResolvedValue(mockUser);

    // Simulate:
    // userModel.findOne({ email }).exec()
    userModelMock.findOne.mockReturnValue({
      exec: execMock,
    });

    // -------------------------
    // Act
    // -------------------------

    // Call the real UsersService.findByEmail() method.
    const result = await usersService.findByEmail('test@example.com');

    // -------------------------
    // Assert
    // -------------------------

    // Verify that findOne() searched using the correct email.
    expect(userModelMock.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    });

    // Verify that exec() was called to execute
    // the Mongoose query.
    expect(execMock).toHaveBeenCalledTimes(1);

    // Verify the user returned by the service.
    expect(result).toEqual(mockUser);
  });

  // =========================================================
  // createUser Test
  // =========================================================

  it('should create a new user', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake user returned by Mongoose after creation.
    const mockCreatedUser = {
      _id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Jeremy',
    };

    // Simulate successful user creation in MongoDB.
    userModelMock.create.mockResolvedValue(mockCreatedUser);

    // -------------------------
    // Act
    // -------------------------

    // Call the real UsersService.createUser() method.
    const result = await usersService.createUser(
      'test@example.com',
      'hashed-password',
      'Jeremy',
    );

    // -------------------------
    // Assert
    // -------------------------

    // Verify that Mongoose create() received
    // the correct user information.
    expect(userModelMock.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Jeremy',
    });

    // Verify that create() was called exactly once.
    expect(userModelMock.create).toHaveBeenCalledTimes(1);

    // Verify the created user returned by the service.
    expect(result).toEqual(mockCreatedUser);
  });
});
