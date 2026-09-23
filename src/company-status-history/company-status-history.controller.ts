import { Controller } from '@nestjs/common';
import { CompanyStatusHistoryService } from './company-status-history.service';

@Controller('company-status-history')
export class CompanyStatusHistoryController {
  constructor(private readonly companyStatusHistoryService: CompanyStatusHistoryService) {}
}
