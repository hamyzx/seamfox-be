import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateKanbanColumnDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsInt()
  kanbanBoardId: number;
}