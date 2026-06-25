import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { ApiClientService } from './api-client.service';
import { ApiDataSourceService } from './api-data-source.service';
import { ApiDataSourceEntity } from '../db/entities/api-data-source.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiDataSourceEntity]),
    CommonModule,
  ],
  providers: [
    ApiClientService,
    ApiDataSourceService,
  ],
  exports: [
    ApiClientService,
    ApiDataSourceService,
  ],
})
export class ApiClientModule {}