import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { ScriptController } from './script.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [PrismaModule, SessionModule],
  providers: [ScriptService],
  controllers: [ScriptController],
  exports: [ScriptService],
})
export class ScriptModule {}