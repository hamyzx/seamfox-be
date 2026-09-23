import { PartialType } from '@nestjs/mapped-types';
import { CreateResumeDownloadDto } from './create-resume-download.dto';

export class UpdateResumeDownloadDto extends PartialType(CreateResumeDownloadDto) {}
