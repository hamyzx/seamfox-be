import { UserStatus, UserRoles } from '../enums/user.enum';

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccessToken {
  email: string;
  id: string;
  status: UserStatus;
  role: UserRoles;
  candidateId?: number;
  companyId?: number;
  socialType?: string | null; 
}

export interface IGetNotificationPayloadTemplate {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
}

export interface ICharityReport {
  orderId: string;
  firstName: string;
  lastName: string;
  amount: number;
  date: string;
  time: string;
  transactionId: number;
}
