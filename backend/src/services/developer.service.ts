import crypto from 'crypto';
import User from '../models/User.model';

export const generateApiKeyForUser = async (userId: string): Promise<string> => {
  const apiKey = `sp_live_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  user.apiKeys.push(hashedKey);
  await user.save();
  
  return apiKey;
};
