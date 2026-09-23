import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { UserThrottlerGuard } from './lib/guards/user-throttler.guard';
import { LastActiveInterceptor } from './lib/interceptor/last-active.interceptor';
import { DatabaseModule } from './database/database.module';
import { JWTModule } from './jwt/jwt.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './notification/notification.module';
import { SettingModule } from './settings/setting.module';
import { CompanyModule } from './company/company.module';
import { CandidateModule } from './candidate/candidate.module';
import { CertificationModule } from './certification/certification.module';
import { EducationModule } from './education/education.module';
import { ResumeModule } from './resume/resume.module';
import { SkillsModule } from './skill/skills.module';
import { SocialProfileModule } from './social-profile/social-profile.module';
import { SeederService } from './lib/seeder/seeder.service';
import { JobModule } from './job/job.module';
import { ApplicationModule } from './application/application.module';
import { CommonModule } from './common/common.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { FeedModule } from './feed/feed.module';
import { CrossWordModule } from './cross-word/cross-word.module';
import { QuizModule } from './quiz/quiz.module';
import { ChatModule } from './chat/chat.module';
import { MysteryModule } from './mystery/mystery.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StripeModule } from './stripe/stripe.module';
import { ReviewModule } from './review/review.module';
import { InterestModule } from './interest/interest.module';
import { ApplicationCommentModule } from './application-comment/application-comment.module';
import { CandidateLanguageModule } from './candidate-language/candidate-language.module';
import { CandidateSkillModule } from './candidate-skills/candidate-skills.module';
import { CandidateNationalityModule } from './candidate-nationality/candidate-nationality.module';
import { CandidateStatusHistoryModule } from './candidate-status-history/candidate-status-history.module';
import { CompanyStatusHistoryModule } from './company-status-history/company-status-history.module';
import { JobLanguageModule } from './job-language/job-language.module';
import { ResumeDownloadModule } from './resume-download/resume-download.module';
import { BullModule } from '@nestjs/bull';
import { bullConfig } from './config/bull.config';
import { TwilioModule } from './twilio/twilio.module';
import { CandidateViewModule } from './candidate-view/candidate-view.module';
import { ReportModule } from './report/report.module';
import { NewsModule } from './news/news.module';
import { NewsAiModule } from './news-ai/news-ai.module';
import { AdminJobModule } from './admin-job/admin-job.module';
import { AdminKanbanModule } from './admin-kanban/admin-kanban.module'; 
import { CvGeneratorModule } from './cv-generator/cv-generator.module';
import { ExperienceModule } from './experience/experience.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot(bullConfig),

    ScheduleModule.forRoot(),


    // Rate limit for feed post creation — 5 posts per 5 minutes per user
    ThrottlerModule.forRoot([
      {
        name: 'post-creation',
        ttl: 5 * 60 * 1000,
        limit: 5,
      },
    ]),

    DatabaseModule,
    JWTModule,
    AuthModule,
    MediaModule,
    TwilioModule,
    UserModule,
    NotificationModule,
    SettingModule,
    ReviewModule,
    CompanyModule,
    CandidateModule,
    CertificationModule,
    ReportModule,
    EducationModule,
    ResumeModule,
    SkillsModule,
    SocialProfileModule,
    JobModule,
    ApplicationModule,
    CommonModule,
    BlogModule,
    FaqModule,
    FeedModule,
    CrossWordModule,
    QuizModule,
    ChatModule,
    MysteryModule,
    SubscriptionModule,
    DashboardModule,
    StripeModule,
    InterestModule,
    ApplicationCommentModule,
    CandidateLanguageModule,
    CandidateSkillModule,
    CandidateNationalityModule,
    CandidateStatusHistoryModule,
    CompanyStatusHistoryModule,
    JobLanguageModule,
    ResumeDownloadModule,
    TwilioModule,
    CandidateViewModule,
    NewsModule,
    NewsAiModule,
    AdminJobModule,
    AdminKanbanModule,
    CvGeneratorModule,
    ExperienceModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LastActiveInterceptor,
    },
  ],
})
export class AppModule {}