import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quota?: number;
}