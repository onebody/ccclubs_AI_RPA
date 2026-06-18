import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type UserRole = 'super_admin' | 'tenant_admin' | 'operator' | 'readonly';

export interface User {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateToken(token: string): Promise<User> {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded as User;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async verifyToken(token: string): Promise<User> {
    return this.validateToken(token);
  }

  async generateToken(user: User): Promise<string> {
    return this.jwtService.sign(user);
  }

  async validateTenant(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });
    return tenant?.enabled ?? false;
  }
}