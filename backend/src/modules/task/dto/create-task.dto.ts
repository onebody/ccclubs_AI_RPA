import { IsString, IsEnum } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  sessionId: string;

  @IsEnum(['script', 'ai'])
  taskType: 'script' | 'ai';

  @IsString()
  payload?: string;
}