import { UserService } from '../services/user.service';
import { AppError } from '../errors/AppError';

jest.mock('../models/User.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

import UserModel from '../models/User.model';

const mockedFindOne = UserModel.findOne as jest.Mock;
const mockedFindByIdAndUpdate = UserModel.findByIdAndUpdate as jest.Mock;

const makeFindOne = (result: unknown) =>
  mockedFindOne.mockReturnValue({ exec: () => Promise.resolve(result) });

const makeFindByIdAndUpdate = (result: unknown) =>
  mockedFindByIdAndUpdate.mockReturnValue({ exec: () => Promise.resolve(result) });

describe('UserService.connectWallet', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  it('throws 409 WALLET_IN_USE when key belongs to a different user', async () => {
    makeFindOne({ _id: { toString: () => 'other-user-id' } });

    await expect(
      service.connectWallet('current-user-id', 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456')
    ).rejects.toMatchObject({ code: 'WALLET_IN_USE', statusCode: 409 });
  });

  it('throws 409 WALLET_ALREADY_LINKED when key already belongs to the same user', async () => {
    makeFindOne({ _id: { toString: () => 'same-user-id' } });

    await expect(
      service.connectWallet('same-user-id', 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456')
    ).rejects.toMatchObject({ code: 'WALLET_ALREADY_LINKED', statusCode: 409 });
  });

  it('throws 404 when user not found after update', async () => {
    makeFindOne(null);
    makeFindByIdAndUpdate(null);

    await expect(
      service.connectWallet('nonexistent-id', 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456')
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
  });

  it('returns updated user on success', async () => {
    const fakeUser = {
      _id: 'user-id',
      email: 'test@example.com',
      stellarPublicKey: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456',
    };
    makeFindOne(null);
    makeFindByIdAndUpdate(fakeUser);

    const result = await service.connectWallet(
      'user-id',
      'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456'
    );
    expect(result).toEqual(fakeUser);
  });
});

describe('UserService.hashApiKey', () => {
  it('returns a deterministic SHA-256 hex string', () => {
    const service = new UserService();
    const hash = service.hashApiKey('test-key');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(service.hashApiKey('test-key'));
  });
});