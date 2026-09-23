import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { Request } from 'express';
import { CvGeneratorProvider } from './cv-generator.provider';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { UploadFileValidationInterceptor } from '../lib/interceptor/mediaValidationInterceptor';
import { FileMimeTypes } from '../lib/enums/media.enum';
import { SUPPORTED_FILE_SIZE_IN_BITS } from '../lib/constants/media';
import { CvGeneratorStatus } from './entities/cv-generator-upload.entity';

@UseGuards(AuthGuard, RolesGuard)
@Controller('cv-generator')
export class CvGeneratorController {
  constructor(private readonly provider: CvGeneratorProvider) {}

  
  @Post('upload')
  @Roles(UserRoles.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file'),
    new UploadFileValidationInterceptor({
      key: 'file',
      fileType: [FileMimeTypes.PDF, FileMimeTypes.DOCX],
      maxSize: SUPPORTED_FILE_SIZE_IN_BITS,
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const data = await this.provider.uploadAndGenerate(file, req.user.id);
    return {
      data,
      status: true,
      message: 'CV uploaded and processed successfully',
    };
  }

  
  @Get()
  @Roles(UserRoles.SUPER_ADMIN)
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: CvGeneratorStatus,
  ) {
    const data = await this.provider.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      status,
    });
    return { data, status: true };
  }

  
  @Get(':id')
  @Roles(UserRoles.SUPER_ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.provider.findOne(id);
    return { data, status: true };
  }

  
  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.provider.delete(id);
    return { data, status: true, message: 'Deleted successfully' };
  }
}