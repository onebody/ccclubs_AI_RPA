import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { CommonModule } from '../common/common.module';

import { TenantController } from './controllers/tenant.controller';
import { UserController } from './controllers/user.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { AuthController } from './controllers/auth.controller';

import { TenantService } from './services/tenant.service';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { AuthService } from './services/auth.service';

import { TenantEntity } from '../db/entities/tenant.entity';
import { UserEntity } from '../db/entities/user.entity';
import { RoleEntity } from '../db/entities/role.entity';
import { PermissionEntity } from '../db/entities/permission.entity';
import { UserRoleEntity } from '../db/entities/user-role.entity';
import { RolePermissionEntity } from '../db/entities/role-permission.entity';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      UserEntity,
      RoleEntity,
      PermissionEntity,
      UserRoleEntity,
      RolePermissionEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CommonModule,
  ],
  controllers: [TenantController, UserController, RoleController, PermissionController, AuthController],
  providers: [TenantService, UserService, RoleService, PermissionService, AuthService, JwtAuthGuard, RolesGuard, JwtStrategy],
  exports: [TenantService, UserService, RoleService, PermissionService, AuthService, JwtAuthGuard, RolesGuard],
})
export class TenantRbacModule {}