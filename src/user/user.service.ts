import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MediaProvider } from '../media/media.provider';
@Injectable()
export class UserService {
  constructor(private mediaProvider: MediaProvider) {}
  async getHashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async isPasswordMatched(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
}
