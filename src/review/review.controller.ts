import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetAllReviewsDto } from './dto/get-all-reviews.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @Roles(UserRoles.COMPANY)
  async create(@Body() dto: CreateReviewDto, @Req() req: Request) {
    dto.companyId = req.user.companyId;
    const data = await this.reviewService.create(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllReviewsDto) {
    const data = await this.reviewService.findAll(query);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.reviewService.findOne(id);
    return { data };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateReviewDto: UpdateReviewDto) {
    const data = await this.reviewService.update(id, updateReviewDto);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.reviewService.remove(id);
    return { data };
  }
}
