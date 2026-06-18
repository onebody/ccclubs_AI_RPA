import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = {
      userId: loginDto.userId,
      tenantId: loginDto.tenantId,
      role: loginDto.role,
    };
    const token = await this.authService.generateToken(user);
    return { access_token: token };
  }
}