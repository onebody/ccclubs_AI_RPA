import { Module } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { EncryptionService } from './services/encryption.service';
import { ResponseService } from './services/response.service';

@Module({
  imports: [],
  providers: [LoggerService, EncryptionService, ResponseService],
  exports: [LoggerService, EncryptionService, ResponseService],
})
export class CommonModule {}