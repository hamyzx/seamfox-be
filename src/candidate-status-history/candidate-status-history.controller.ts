import { Controller } from '@nestjs/common';
import { CandidateStatusHistoryService } from './candidate-status-history.service';

@Controller('candidate-status-history')
export class CandidateStatusHistoryController {
  constructor(private readonly candidateStatusHistoryService: CandidateStatusHistoryService) {}
}
