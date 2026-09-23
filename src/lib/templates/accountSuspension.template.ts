import { AccountSuspenionStatus } from '../enums/account-suspension.enum';

interface ITemplate {
  status: AccountSuspenionStatus;
  title: string;
}

export const getAccountSuspensionText = ({ status, title }: ITemplate) =>
  // eslint-disable-next-line max-len
  `Hello,\n\nYour account suspension request titled "${title}" has been ${status.toLowerCase()} by the administrator.\n\nIf you have any questions or believe this was done in error please contact support.\n\nThank you!`;

export const getAccountSuspensionTemplate = ({ status, title }: ITemplate) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Account Suspension Update</h2>
    <p style="font-size: 16px; color: #555;">Your account suspension request titled "<strong>${title}</strong>" has been <strong>${status.toLowerCase()}</strong> by the administrator.</p>
    <p style="font-size: 16px; color:#555;">Thank you!</p>
  </div>
`;
