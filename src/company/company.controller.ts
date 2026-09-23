import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetAllCompanyDto } from './dto/get-all-company.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  create(@Body() dto: CreateCompanyDto, @Req() req: Request) {
    const userId = req.user.role === UserRoles.SUPER_ADMIN ? dto.userId : req.user.id;
    return this.companyService.create({ ...dto, userId });
  }

  @Get()
  @Roles(UserRoles.SUPER_ADMIN)
  async findAll(@Query() query: GetAllCompanyDto): Promise<IResponse> {
    const data = await this.companyService.findAll(query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<IResponse> {
    const data = await this.companyService.findOne(id);
    return { data, message: 'Data Fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ) {
    if (req.user.role === UserRoles.COMPANY) {
      const company = await this.companyService.findOne(id);
      if (company.userId !== req.user.id) {
        throw new ForbiddenException('You can only update your own company record');
      }
    }
    const adminId = req.user.role === UserRoles.SUPER_ADMIN ? req.user.id : undefined;
    return this.companyService.update(id, dto, adminId);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    if (req.user.role === UserRoles.COMPANY) {
      const company = await this.companyService.findOne(id);
      if (company.userId !== req.user.id) {
        throw new ForbiddenException('You can only delete your own company record');
      }
    }
    return this.companyService.remove(id);
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  @Get('settings/templates')
  @Roles(UserRoles.COMPANY)
  async getTemplates(@Req() req: Request) {
    const data = await this.companyService.getTemplates(req.user.id);
    return { status: true, data };
  }

  @Post('settings/templates')
  @Roles(UserRoles.COMPANY)
  async saveTemplates(@Req() req: Request, @Body() body: { templates: Record<string, string> }) {
    const data = await this.companyService.saveTemplates(req.user.id, body.templates);
    return { status: true, data };
  }
}