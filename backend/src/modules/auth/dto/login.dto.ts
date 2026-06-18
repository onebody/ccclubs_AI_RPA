import { IsString, IsEnum } from 'class-validator';
import { UserRole } from '../auth.service';

export class LoginDto {
  @IsString()
  userId: string;

  @IsString()
  tenantId: string;

  @IsEnum(['super_admin', 'tenant_admin', 'operator', 'readonly'])
  role: UserRole;
}