import { IUser } from '../../../user/interface/user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
