import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CfarService } from './cfar.service';
import { WindowProfileService } from './window-profile.service';
import { CreateProfileRequestDto } from './dto/create-profile-request.dto';
import { DetectRequestDto } from './dto/detect-request.dto';

/**
 * 整套服务只做 CA-CFAR 这一件事，所有交互都走这几个 HTTP 端点。
 */
@Controller('cfar')
export class CfarController {
  constructor(
    private readonly cfarService: CfarService,
    private readonly profileService: WindowProfileService,
  ) {}

  /** 提交一条距离线跑一趟滑窗，拿回逐单元阈值/检出/无效与本趟 α、N。 */
  @Post('detect')
  @HttpCode(HttpStatus.OK)
  detect(@Body() body: DetectRequestDto) {
    return this.cfarService.detect(body ?? {});
  }

  /** 列出已登记的具名窗规。 */
  @Get('profiles')
  listProfiles() {
    return { profiles: this.profileService.list() };
  }

  /** 运行期追加窗规到内存（不落库）；重名 409。 */
  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  addProfile(@Body() body: CreateProfileRequestDto) {
    return this.profileService.add(body ?? {});
  }
}
