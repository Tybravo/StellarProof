import { createHash } from 'crypto';
import User, { IUser } from '../models/User.model';

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
}

export const userService = new UserService();
