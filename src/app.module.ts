import { Module } from '@nestjs/common';
import { CfarModule } from './cfar/cfar.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CfarModule],
  controllers: [HealthController],
})
export class AppModule {}
