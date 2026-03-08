import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { ValidationController } from './validation.controller';
import { LoggerModule } from '../common/logger/logger.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [LoggerModule, AuditModule],
  controllers: [ValidationController],
  providers: [ValidationService],
})
export class ValidationModule {}
