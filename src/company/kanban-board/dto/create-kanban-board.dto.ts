import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateKanbanBoardDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsInt()
  companyId: number;
}
