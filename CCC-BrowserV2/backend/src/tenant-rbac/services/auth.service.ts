import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { TenantService } from './tenant.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async login(phone: string, password: string): Promise<{ access_token: string; user: any }> {
    const user = await this.userService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.encryptionService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, phone: user.phone, tenantId: user.tenantId };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phone,
        tenantId: user.tenantId,
        username: user.username,
      },
    };
  }

  async register(tenantId: string, phone: string, password: string, username?: string): Promise<any> {
    const existingUser = await this.userService.findByPhone(phone);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const hashedPassword = await this.encryptionService.hashPassword(password);
    const user = await this.userService.create({
      tenantId,
      phone,
      password: hashedPassword,
      username: username || phone,
    });

    return {
      id: user.id,
      phone: user.phone,
      tenantId: user.tenantId,
      username: user.username,
    };
  }
}