import { IsString } from 'class-validator';

export class ExecuteAiCommandDto {
  @IsString()
  command: string;
}