import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsBoolean } from 'class-validator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsBoolean()
  enabled?: boolean;
}