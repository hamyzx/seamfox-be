import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { GetAllFaqDto } from './dto/get-all-faq.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN)
  async create(@Body() dto: CreateFaqDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.faqService.create(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllFaqDto) {
    const data = await this.faqService.findAll(query);
    return { data, message: 'Data fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.faqService.findOne(id);
    return { data, message: 'Data fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFaqDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.faqService.update(id, dto);
    return { data, message: 'Data updated successfully' };
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const deletedBy = req.user.id;
    return this.faqService.remove(id, deletedBy);
  }
}
