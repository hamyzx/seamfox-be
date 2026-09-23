import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Request } from 'express';
import { UploadFileValidationInterceptor } from '../lib/interceptor/mediaValidationInterceptor';
import { FileMimeTypes, FolderNames } from '../lib/enums/media.enum';
import { SUPPORTED_FILE_SIZE_IN_BITS } from '../lib/constants/media';
import { MediaProvider } from './media.provider';
import { AuthGuard } from '../lib/guards/auth.guard';
import { RolesGuard } from '../lib/guards/roles.guard';
import { SubscriptionService } from '../subscription/subscription.service';
import { ResumeService } from '../resume/resume.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaProvider: MediaProvider,
    private readonly subscriptionService: SubscriptionService,
    private readonly resumeService: ResumeService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file'),
    new UploadFileValidationInterceptor({
      key: 'file',
      fileType: [
        FileMimeTypes.JPG,
        FileMimeTypes.PNG,
        FileMimeTypes.PDF,
        FileMimeTypes.WEBP,
        FileMimeTypes.DOCX,
      ],
      maxSize: SUPPORTED_FILE_SIZE_IN_BITS,
    }),
  )
  async uploadedFile(@UploadedFile() file: Express.Multer.File) {
    const key = await this.mediaProvider.createFile(file);
    const url = this.mediaProvider.getMediaUrl(key);
    return { data: { key, url } };
  }

  @Post('upload-cv')
  @UseInterceptors(
    FileInterceptor('file'),
    new UploadFileValidationInterceptor({
      key: 'file',
      fileType: [
        FileMimeTypes.JPG,
        FileMimeTypes.PNG,
        FileMimeTypes.PDF,
        FileMimeTypes.WEBP,
        FileMimeTypes.DOCX,
      ],
      maxSize: SUPPORTED_FILE_SIZE_IN_BITS,
    }),
  )
  // async uploadedFileCandidate(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
  //   console.log('🔥 [CONTROLLER] START upload');
  //   // 🔥 read from form-data
  //   const candidateIdBody = req.body.candidateId;
  //   const candidateId = req.user.candidateId || candidateIdBody;

  //   if (!candidateId) {
  //     throw new BadRequestException('candidateId is required in form-data');
  //   }

  //   // 1. Get company job-posting limit
  //   const limit = await this.subscriptionService.getFeatureLimit(req.user.id, 7);

  //   // 2. Count resumes instead of jobs
  //   const resumeCount = await this.resumeService.countCandidateResumes(candidateId);

  //   if (
  //     limit?.limit !== null &&
  //     limit?.limit !== '' &&
  //     limit?.limit !== 'true' &&
  //     limit?.limit?.toLowerCase() !== 'unlimited'
  //   ) {
  //     if (resumeCount >= Number(limit?.limit)) {
  //       throw new BadRequestException(
  //         `Your resume upload limit (${limit?.limit}) has been reached. Upgrade your plan to upload more resumes.`,
  //       );
  //     }
  //   }

  //   try {
  //     const result = await this.mediaProvider.createFileCandidate(
  //       file,
  //       FolderNames.DEFAULT,
  //       candidateId,
  //     );
  //     return {
  //       message:
  //         'Your Cv has been uploaded, once it parsed and your profile completed it will shown there!',
  //       data: result,
  //     };
  //   } catch (err) {
  //     console.log('❌ CONTROLLER ERROR:', err);
  //     throw err;
  //   }
  // }

  async uploadedFileCandidate(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
  console.log('🔥 [CONTROLLER] START upload');
  console.log('📁 File received:', file?.originalname, file?.size, file?.mimetype);
  
  const candidateIdBody = req.body.candidateId;
  const candidateId = req.user.candidateId || candidateIdBody;
  console.log('👤 candidateId:', candidateId);

  if (!candidateId) {
    throw new BadRequestException('candidateId is required in form-data');
  }

  // 1. Get company job-posting limit
  console.log('⏳ [STEP 1] Calling getFeatureLimit...');
  const limit = await this.subscriptionService.getFeatureLimit(req.user.id, 7);
  console.log('✅ [STEP 1] limit:', limit);

  // 2. Count resumes instead of jobs
  console.log('⏳ [STEP 2] Calling countCandidateResumes...');
  const resumeCount = await this.resumeService.countCandidateResumes(candidateId);
  console.log('✅ [STEP 2] resumeCount:', resumeCount);

  if (
    limit?.limit !== null &&
    limit?.limit !== '' &&
    limit?.limit !== 'true' &&
    limit?.limit?.toLowerCase() !== 'unlimited'
  ) {
    if (resumeCount >= Number(limit?.limit)) {
      throw new BadRequestException(
        `Your resume upload limit (${limit?.limit}) has been reached. Upgrade your plan to upload more resumes.`,
      );
    }
  }

  try {
    console.log('⏳ [STEP 3] Calling createFileCandidate...');
    const result = await this.mediaProvider.createFileCandidate(
      file,
      FolderNames.DEFAULT,
      candidateId,
    );
    console.log('✅ [STEP 3] Upload complete');
    return {
      message:
        'Your Cv has been uploaded, once it parsed and your profile completed it will shown there!',
      data: result,
    };
  } catch (err) {
    console.log('❌ CONTROLLER ERROR:', err);
    throw err;
  }
}

  @Post('upload-cv/:resumeId')
  @UseInterceptors(
    FileInterceptor('file'),
    new UploadFileValidationInterceptor({
      key: 'file',
      fileType: [
        FileMimeTypes.JPG,
        FileMimeTypes.PNG,
        FileMimeTypes.PDF,
        FileMimeTypes.WEBP,
        FileMimeTypes.DOCX,
      ],
      maxSize: SUPPORTED_FILE_SIZE_IN_BITS,
    }),
  )
  async updateResumeFileCandidate(
    @UploadedFile() file: Express.Multer.File,
    @Param('resumeId', ParseIntPipe) resumeId: number,
    @Req() req: Request,
  ) {
    console.log('🔥 [CONTROLLER] START upload');
    // 🔥 read from form-data
    const candidateIdBody = req.body.candidateId;
    const candidateId = req.user.candidateId || candidateIdBody;
    console.log('👤 Received candidateId from form-data =', candidateId);

    if (!candidateId) {
      throw new BadRequestException('candidateId is required in form-data');
    }

    try {
      const result = await this.mediaProvider.updateResumeCv(
        file,
        resumeId,
        candidateId,
        FolderNames.DEFAULT,
      );
      return {
        message:
          'Your Cv has been uploaded, once it parsed and your profile completed it will shown there!',
        data: result,
      };
    } catch (err) {
      console.log('❌ CONTROLLER ERROR:', err);
      throw err;
    }
  }

  // 🔥 NEW: Synchronous CV parser for onboarding flow (Phase 2 — CV-first onboarding)
  // Returns structured JSON to prefill onboarding steps 1, 2, 3 immediately
  // Also extracts photo from CV and uploads to S3 for profile picture
  @Post('parse-cv-for-onboarding')
  @UseInterceptors(
    FileInterceptor('file'),
    new UploadFileValidationInterceptor({
      key: 'file',
      fileType: [FileMimeTypes.PDF, FileMimeTypes.DOCX],
      maxSize: SUPPORTED_FILE_SIZE_IN_BITS,
    }),
  )
  async parseCvForOnboarding(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    console.log('🔥 [CONTROLLER] parse-cv-for-onboarding START');

    if (!file) {
      throw new BadRequestException('CV file is required');
    }

    try {
      const result = await this.mediaProvider.parseCvForOnboarding(file);
      return {
        status: true,
        message: 'CV parsed successfully',
        data: result,
      };
    } catch (err: any) {
      console.log('❌ parse-cv-for-onboarding ERROR:', err);
      throw new BadRequestException(err.message || 'Failed to parse CV');
    }
  }

  @Get('sign')
  async signForUpload(
    @Query('mime') mime: string,
    @Query('ext') ext?: string,
    @Query('folder') folder?: FolderNames,
  ) {
    const data = await this.mediaProvider.signUpload(mime, ext, folder);
    return { data };
  }
}
