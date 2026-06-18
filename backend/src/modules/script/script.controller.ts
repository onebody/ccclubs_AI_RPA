import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScriptService } from './script.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('script')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('execute')
  @Roles('operator')
  executeScript(@Body() body: { sessionId: string; script: string }) {
    return this.scriptService.executeScript(body);
  }

  @Get(':sessionId/result/:requestId')
  @Roles('operator', 'readonly')
  getScriptResult(@Param('sessionId') sessionId: string, @Param('requestId') requestId: string) {
    return this.scriptService.getScriptResult(sessionId, requestId);
  }
}