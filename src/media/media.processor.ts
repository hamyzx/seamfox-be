import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ResumeService } from '../resume/resume.service';
import { MediaProvider } from './media.provider';
import { MediaService } from './media.service';

@Processor('cv-processing')
export class MediaProcessor {
  constructor(
    private readonly mediaProvider: MediaProvider,
    private readonly mediaService: MediaService,
    private readonly resumeService: ResumeService,
  ) {}

  @Process('parse-cv')
  async handle(job: Job) {
    const { originalKey, folderName, candidateId, fileName, candidateProfileImage } = job.data;

    console.log('Downloading file from S3...');

    const buffer = await this.mediaService.getFileBuffer(originalKey);

    const file = { originalname: fileName, buffer };

    console.log('Starting background processing...');

    // 🔥 Generate PDF — filename uses the name extracted from inside the CV
    const result = await this.mediaProvider.processCvAsPdf(
      file,
      originalKey,
      folderName,
      candidateProfileImage ?? null,
    );

    if (result.processedKey) {
      await this.resumeService.create({
        candidateId,
        filePath: result.processedKey, // ✅ PDF key
      });
    }

    console.log('Processing Done.');
  }

  @Process('parse-cv-update')
  async handleUpdate(job: Job) {
    const { resumeId, candidateId, originalKey, fileName, folderName, candidateProfileImage } =
      job.data;

    console.log('🔄 Updating existing CV:', resumeId);

    const buffer = await this.mediaService.getFileBuffer(originalKey);

    const file = { originalname: fileName, buffer };

    // 🔥 Generate PDF — filename uses the name extracted from inside the CV
    const result = await this.mediaProvider.processCvAsPdf(
      file,
      originalKey,
      folderName,
      candidateProfileImage ?? null,
    );

    if (result.processedKey) {
      await this.resumeService.updateResumeFile(resumeId, result.processedKey); // ✅ PDF key
    }

    console.log('✅ Resume updated');
  }
}