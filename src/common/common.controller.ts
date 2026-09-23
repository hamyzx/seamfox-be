import { Controller, Get, Query } from '@nestjs/common';
import { CommonService } from './common.service';
import { GetAllDto } from './dto/get-all.dto';

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Get('industries')
  async getIndustries(@Query() dto: GetAllDto) {
    const data = await this.commonService.getIndustries(dto);
    return { data, message: 'Data fetched successfully' };
  }

  @Get('languages')
  async getLanguages(@Query() dto: GetAllDto) {
    const data = await this.commonService.getLanguages(dto);
    return { data, message: 'Data fetched successfully' };
  }

  @Get('nationalities')
  async getNationalities(@Query() dto: GetAllDto) {
    const data = await this.commonService.getNationalities(dto);
    return { data, message: 'Data fetched successfully' };
  }

  @Get('skills')
  async getSkills(@Query() dto: GetAllDto) {
    const data = await this.commonService.getSkills(dto);
    return { data, message: 'Data fetched successfully' };
  }

  @Get('educations')
  async getEducation(@Query() dto: GetAllDto) {
    const data = await this.commonService.getEducations(dto);
    return { data, message: 'Data fetched successfully' };
  }
}
