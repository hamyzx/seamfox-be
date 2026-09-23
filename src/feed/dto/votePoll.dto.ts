import { IsNotEmpty, IsUUID } from 'class-validator';

export class VotePollDto {
  @IsUUID('4')
  @IsNotEmpty()
  optionId: string;
}