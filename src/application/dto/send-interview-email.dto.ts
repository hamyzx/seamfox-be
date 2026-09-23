import { IsString, IsEmail, ValidateIf } from 'class-validator';

export class SendInterviewEmailDto {
  @IsEmail()
  candidateEmail: string;

  @ValidateIf(
    (o) =>
      o.companyEmail !== undefined &&
      o.companyEmail !== null &&
      o.companyEmail !== '',
  )
  @IsEmail()
  companyEmail?: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsString()
  candidateName: string;

  @IsString()
  jobTitle: string;

  @IsString()
  companyName: string;
}