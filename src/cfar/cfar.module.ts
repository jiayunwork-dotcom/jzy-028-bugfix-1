import { Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CfarController } from './cfar.controller';
import { CfarExceptionFilter } from './cfar.exception-filter';
import { CfarService } from './cfar.service';
import { DEFAULT_PROFILES } from './default-profiles';
import { WindowProfileService } from './window-profile.service';

/**
 * 窗规启动时载入：在模块初始化钩子里把默认窗规灌进内存存储。
 * 领域错误通过全局 APP_FILTER 映射成 HTTP 状态码。
 */
@Module({
  controllers: [CfarController],
  providers: [
    CfarService,
    WindowProfileService,
    { provide: APP_FILTER, useClass: CfarExceptionFilter },
  ],
})
export class CfarModule implements OnModuleInit {
  constructor(private readonly profileService: WindowProfileService) {}

  onModuleInit(): void {
    this.profileService.seed(DEFAULT_PROFILES);
  }
}
