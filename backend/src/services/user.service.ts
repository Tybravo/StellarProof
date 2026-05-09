import { createHash } from 'crypto';
import User, { IUser } from '../models/User.model';
import { AppError } from '../errors/AppError';

export class UserService {
  hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  async findActiveUserByApiKey(apiKey: string): Promise<IUser | null> {
    const hashedApiKey = this.hashApiKey(apiKey);

    return User.findOne({
      apiKeys: hashedApiKey,
      isActive: true,
    }).exec();
  }

  async connectWallet(userId: string, stellarPublicKey: string): Promise<IUser> {
    const existing = await User.findOne({ stellarPublicKey }).exec();
    if (existing) {
      if (existing._id.toString() === userId) {
        throw new AppError(
          'This Stellar wallet is already linked to your account',
          409,
          'WALLET_ALREADY_LINKED'
        );
      }
      throw new AppError(
        'This Stellar wallet is already linked to another account',
        409,
        'WALLET_IN_USE'
      );
    }


    const updated = await User.findByIdAndUpdate(
      userId,
      { stellarPublicKey },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return updated;
  }



  async getProfile(userId: string): Promise<IUser> {
  const user = await User.findById(userId).exec();
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
}

async updateProfile(userId: string, updates: Partial<IUser>): Promise<IUser> {
  // Restricted fields that cannot be updated via this route
  const RESTRICTED_FIELDS = [
    'role',
    'passwordHash',
    'apiKeys',
    'isActive',
    'resetPasswordToken',
    'resetPasswordExpires',
    'nonce',
  ];

  // Strip restricted fields silently
  RESTRICTED_FIELDS.forEach(field => delete (updates as Record<string, unknown>)[field]);

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).exec();

  if (!updated) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return updated;
}


}

export const userService = new UserService();

