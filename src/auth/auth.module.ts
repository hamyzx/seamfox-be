import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthProvider } from './auth.provider';
import { EmailService } from '../services/mail.service';
import { UserModule } from '../user/user.module';
import { MediaModule } from '../media/media.module';
import { OTP } from './entities/otp.entity';
import { LoginActivity } from './entities/login-activity.entity';
import { OtpRepository } from './repository/otp.repository';
import { LoginActivityRepository } from './repository/login-activity.repository';
import { CandidateModule } from '../candidate/candidate.module';
import { CompanyModule } from '../company/company.module';
import { OTPPhone } from './entities/otp-phone.entity';
import { OTPPhoneRepository } from './repository/otp-phone.repository';
import { TwilioModule } from '../twilio/twilio.module';
import { Job } from '../job/entities/job.entity';

@Module({
  imports: [
    UserModule,
    MediaModule,
    CandidateModule,
    CompanyModule,
    TwilioModule,
    TypeOrmModule.forFeature([OTP, OTPPhone, LoginActivity, Job]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthProvider,
    EmailService,
    OtpRepository,
    LoginActivityRepository,
    OTPPhoneRepository,
  ],
  exports: [LoginActivityRepository],
})
export class AuthModule {}