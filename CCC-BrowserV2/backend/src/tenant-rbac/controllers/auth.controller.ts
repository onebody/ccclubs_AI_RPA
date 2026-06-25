import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { phone: string; password: string }) {
    return this.authService.login(body.phone, body.password);
  }

  @Public()
  @Post('register')
  async register(@Body() body: { tenantId: string; phone: string; password: string; username?: string }) {
    return this.authService.register(body.tenantId, body.phone, body.password, body.username);
  }
}