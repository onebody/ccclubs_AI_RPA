import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  memoryLimit?: string;

  @IsString()
  cpuLimit?: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  maxLifetime?: number;
}