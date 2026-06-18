import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ExecuteAiCommandDto } from './dto/execute-ai-command.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-task')
  @Roles('operator')
  parsePageTask(@Body() body: { dom: string; screenshot: string; userCommand: string }) {
    return this.aiService.parsePageTask(body);
  }

  @Post('ocr')
  @Roles('operator')
  ocrImage(@Body() body: { imageBuffer: string }) {
    return this.aiService.ocrImage(body);
  }

  @Post('extract')
  @Roles('operator')
  extractStructData(@Body() body: { dom: string; ruleJson: string }) {
    return this.aiService.extractStructData(body);
  }

  @Post(':sessionId/command')
  @Roles('operator')
  executeCommand(@Param('sessionId') sessionId: string, @Body() executeAiCommandDto: ExecuteAiCommandDto) {
    return this.aiService.executeCommand(sessionId, executeAiCommandDto.command);
  }
}