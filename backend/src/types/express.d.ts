import { IUser } from '../models/User.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
