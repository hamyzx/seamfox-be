import {
  Controller, Get, Post, Req, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GetAllPackagesDto } from './dto/get-all-packages.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Post('package')
  @Roles(UserRoles.SUPER_ADMIN)
  async createPackage(@Body() dto: CreatePackageDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.service.createPackage(dto);
    return { data };
  }

  @Get('package')
  async findAllPackages(@Query() query: GetAllPackagesDto) {
    const data = await this.service.findAllPackages(query);
    return { data };
  }

  @Patch('package/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async updatePackage(@Param('id') id: number, @Body() dto: UpdatePackageDto, @Req() req: Request) {
    dto.updatedBy = req.user.id;
    const data = await this.service.updatePackage(id, dto);
    return { data };
  }

  @Delete('package/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async deletePackage(@Param('id') id: number, @Req() req: Request) {
    const data = await this.service.deletePackage(id, req.user.id);
    return { data };
  }

  @Post('package/feature')
  @Roles(UserRoles.SUPER_ADMIN)
  async addFeature(@Body() dto: CreateFeatureDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.service.addFeature(dto);
    return { data };
  }

  @Patch('package/feature/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async updateFeature(@Param('id') id: number, @Body() dto: UpdateFeatureDto, @Req() req: Request) {
    dto.updatedBy = req.user.id;
    const data = await this.service.updateFeature(id, dto);
    return { data };
  }

  @Delete('package/feature/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async deleteFeature(@Param('id') id: number, @Req() req: Request) {
    const data = await this.service.deleteFeature(id, req.user.id);
    return { data };
  }

  // ✅ Paid subscription — Stripe Checkout (used after trial phase)
  @Post()
  @Roles(UserRoles.COMPANY, UserRoles.CANDIDATE)
  async createSubscription(@Body() dto: CreateSubscriptionDto, @Req() req: Request) {
    dto.userId = req.user.id;
    dto.createdBy = req.user.id;
    const data = await this.service.createSubscription(dto);
    return { data };
  }

  @Get()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR, UserRoles.COMPANY, UserRoles.CANDIDATE)
  async getSubscription(@Query() query: GetAllPackagesDto) {
    const data = await this.service.findAllSubscriptions(query);
    return { data };
  }

  @Get('/user')
  @Roles(UserRoles.COMPANY, UserRoles.CANDIDATE)
  async getSubscriptionByUser(@Req() req: Request) {
    const data = await this.service.findSubscriptionByUser(req.user.id);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateSubscription(@Param('id') id: number, @Body() dto: UpdateSubscriptionDto, @Req() req: Request) {
    dto.updatedBy = req.user.id;
    const data = await this.service.updateSubscription(id, dto);
    return { data };
  }

  @Post('payment')
  @Roles(UserRoles.COMPANY, UserRoles.CANDIDATE)
  async recordPayment(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.service.recordPayment(dto);
    return { data };
  }

  @Post('purchase')
  adminPurchase(@Body() body, @Req() req) {
    return this.service.adminPurchasePackage(body.userId, body.packageId, body.billingCycle, req.user.id);
  }

  @Post('payment/confirmation')
  async confirmPayment(@Body('referenceNo') referenceNo: string) {
    const data = await this.service.confirmPayment(referenceNo);
    return { data };
  }

  @Post('activate-trial')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY) 
  async activateTrial(@Req() req: Request) {
    const data = await this.service.activateTrial(req.user.id);
    return { data, status: true, message: 'Free trial activated successfully!' };
  }
}