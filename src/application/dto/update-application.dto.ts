import { IsInt ,IsOptional, IsString} from 'class-validator';

export class UpdateApplicationDto {
  @IsInt()
  kanbanBoardStatusId: number;

  @IsOptional()
  @IsString()
  emailMessage?: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;
}
