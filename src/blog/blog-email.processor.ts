import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../services/mail.service';

// 🔥 Job payload shape — har email job me yeh data hota hai
export interface BlogEmailJobData {
  to: string;
  subject: string;
  html: string;
  text: string;
  blogId: number;
  recipientName: string;
}

export const BLOG_EMAIL_QUEUE = 'blog-email-notifications';

@Processor(BLOG_EMAIL_QUEUE)
export class BlogEmailProcessor {
  private readonly logger = new Logger(BlogEmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  // 🔥 Each job calls this method — runs in background, not blocking HTTP requests
  @Process({
    name: 'send-blog-email',
    concurrency: 4, // 🔥 4 emails in parallel (Microsoft Graph rate-limit safe)
  })
  async handleSendBlogEmail(job: Job<BlogEmailJobData>) {
    const { to, subject, html, text, blogId, recipientName } = job.data;

    try {
      await this.emailService.send({ to, subject, text, html });

      this.logger.log(
        `[BlogEmail] Sent to ${recipientName} <${to}> (blog ${blogId}, job ${job.id})`,
      );

      return { success: true, to, blogId };
    } catch (err: any) {
      this.logger.error(
        `[BlogEmail] Failed for ${to} (blog ${blogId}, job ${job.id}): ${err?.message ?? err}`,
      );
      // 🔥 Throw so Bull marks job failed → it will auto-retry per the config
      throw err;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<BlogEmailJobData>) {
    this.logger.debug(`[BlogEmail] Job ${job.id} completed (${job.data.to})`);
  }

  @OnQueueFailed()
  onFailed(job: Job<BlogEmailJobData>, err: Error) {
    const attempts = job.attemptsMade;
    const max = job.opts.attempts || 3;
    this.logger.warn(
      `[BlogEmail] Job ${job.id} failed (attempt ${attempts}/${max}) for ${job.data.to}: ${err.message}`,
    );
  }
}