import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser } from '../models/User.model';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    stellarPublicKey?: string;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  role?: 'creator' | 'developer';
}

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  };
}

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    const token = jwt.sign(
      { userId: user._id.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        ...(user.stellarPublicKey ? { stellarPublicKey: user.stellarPublicKey } : {}),
      },
    };
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    const { email, password, role } = input;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }

    const user = new User({
      email,
      passwordHash: password,
      role: role ?? 'creator',
    });

    await user.save();

    return {
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async verifyTokenAndGetUser(token: string) {
    if (!token) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    } catch (err) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    const user = await User.findById(decoded.userId).exec();
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }
    return user;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    // Silently succeed if user not found to prevent enumeration
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Token is generated — email delivery is handled by the caller or a mailer service
    // rawToken would be sent via email in a production setup
  }
}

export const authService = new AuthService();