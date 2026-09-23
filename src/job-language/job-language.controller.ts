import { Controller, Get, Post, Delete, Param, Body, Patch } from '@nestjs/common';
import { JobLanguageService } from './job-language.service';
import { CreateJobLanguageDto } from './dto/create-job-language.dto';
import { UpdateJobLanguageDto } from './dto/update-job-language.dto';

@Controller('job-language')
export class JobLanguageController {
  constructor(private readonly jobLanguageService: JobLanguageService) {}

  @Post()
  async create(@Body() dto: CreateJobLanguageDto) {
    return this.jobLanguageService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: number, @Body() dto: UpdateJobLanguageDto) {
    return this.jobLanguageService.update(id, dto);
  }

  @Get()
  async findAll() {
    return this.jobLanguageService.findAll();
  }

  @Get(':jobId')
  async findByJob(@Param('jobId') jobId: number) {
    return this.jobLanguageService.findByJob(jobId);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.jobLanguageService.remove(id);
  }
}
