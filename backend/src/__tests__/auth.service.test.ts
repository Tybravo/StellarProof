import { AuthService } from '../services/auth.service';
import crypto from 'crypto';

jest.mock('../models/User.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-jest',
    JWT_EXPIRES_IN: '7d',
  },
}));

import UserModel from '../models/User.model';

const mockedFindOne = UserModel.findOne as jest.Mock;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-123' },
    email: 'user@example.com',
    role: 'creator',
    isActive: true,
    stellarPublicKey: undefined,
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined,
    comparePassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mockFindOne(result: unknown) {
  mockedFindOne.mockReturnValue({
    select: () => ({ exec: () => Promise.resolve(result) }),
  });
}

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it('throws 400 when email or password is missing', async () => {
    await expect(service.login('', 'pass')).rejects.toMatchObject({
      statusCode: 400,
      code: 'MISSING_CREDENTIALS',
    });
    await expect(service.login('email@x.com', '')).rejects.toMatchObject({
      statusCode: 400,
      code: 'MISSING_CREDENTIALS',
    });
  });

  it('throws 401 INVALID_CREDENTIALS when user is not found', async () => {
    mockFindOne(null);
    await expect(service.login('unknown@x.com', 'pass')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws 403 ACCOUNT_DEACTIVATED when user is inactive', async () => {
    mockFindOne(makeUser({ isActive: false }));
    await expect(service.login('user@example.com', 'pass')).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_DEACTIVATED',
    });
  });

  it('throws 401 INVALID_CREDENTIALS when password does not match', async () => {
    const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    mockFindOne(user);
    await expect(service.login('user@example.com', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('returns token and user data on successful login', async () => {
    mockFindOne(makeUser());
    const result = await service.login('user@example.com', 'correct-pass');

    expect(result).toMatchObject({
      token: expect.any(String),
      user: {
        id: 'user-123',
        email: 'user@example.com',
        role: 'creator',
      },
    });
    expect(result.token.split('.')).toHaveLength(3);
  });

  it('does not leak stellarPublicKey when it is not set', async () => {
    mockFindOne(makeUser({ stellarPublicKey: undefined }));
    const result = await service.login('user@example.com', 'pass');
    expect(result.user).not.toHaveProperty('stellarPublicKey');
  });

  it('includes stellarPublicKey in response when wallet is linked', async () => {
    const key = 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12';
    mockFindOne(makeUser({ stellarPublicKey: key }));
    const result = await service.login('user@example.com', 'pass');
    expect(result.user.stellarPublicKey).toBe(key);
  });
});

describe('AuthService.forgotPassword', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('hashes and stores a reset password token for an existing user', async () => {
    const rawToken = 'a'.repeat(64);
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from(rawToken, 'hex') as never);

    const user = makeUser({
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    });

    mockFindOne(user);

    const result = await service.forgotPassword(' USER@example.com ');

    expect(mockedFindOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(user.resetPasswordToken).toBe(hashedToken);
    expect(user.resetPasswordToken).not.toBe(rawToken);
    expect(user.resetPasswordExpires).toBeInstanceOf(Date);
    expect((user.resetPasswordExpires as Date).getTime()).toBeGreaterThan(Date.now());
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });

  it('returns success without saving when the email does not exist', async () => {
    mockFindOne(null);

    const result = await service.forgotPassword('missing@example.com');

    expect(result).toEqual({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });
});
