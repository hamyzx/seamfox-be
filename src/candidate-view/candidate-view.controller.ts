import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CandidateViewService } from './candidate-view.service';
import { CreateCandidateViewDto } from './dto/create-candidate-view.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate-view')
export class CandidateViewController {
  constructor(private readonly candidateViewService: CandidateViewService) {}

  @Post()
  @Roles(UserRoles.COMPANY)
  async create(@Body() dto: CreateCandidateViewDto, @Req() req: any) {
    dto.companyId = req.user.companyId; // injected automatically

    const senderId = req.user.id; // UUID of company.user

    return this.candidateViewService.create(dto, senderId);
  }
}
