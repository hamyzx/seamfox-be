import { Controller, Get, Param } from '@nestjs/common';
import { JobService } from './job.service';

@Controller('job')
export class JobPublicController {
  constructor(private readonly jobService: JobService) {}

  @Get(':id/public')
  async findPublicMeta(@Param('id') id: number) {
    const data = await this.jobService.findPublicMeta(+id);
    return { data, message: 'Public job meta fetched successfully' };
  }
}