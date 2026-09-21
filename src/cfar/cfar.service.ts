import { Injectable } from '@nestjs/common';
import { detect } from './domain/detector';
import { CfarValidationError } from './domain/errors';
import { CfarResult } from './domain/types';
import { WindowProfileService } from './window-profile.service';

export interface DetectRequestBody {
  amplitudes?: unknown;
  profileName?: unknown;
  guardCells?: unknown;
  referenceCellsPerSide?: unknown;
  pfa?: unknown;
}

/**
 * CFAR 应用服务：负责“窗规名 vs 内联参数”的取用编排，
 * 真正的 α 计算、参考切片、逐单元判决都在 domain 层。
 */
@Injectable()
export class CfarService {
  constructor(private readonly profileService: WindowProfileService) {}

  detect(body: DetectRequestBody): CfarResult {
    if (body === null || typeof body !== 'object') {
      throw new CfarValidationError('request body must be an object');
    }

    // 点具名窗规：未登记由 profileService 抛 404，绝不静默回退。
    if (body.profileName !== undefined && body.profileName !== null) {
      if (typeof body.profileName !== 'string') {
        throw new CfarValidationError('profileName must be a string');
      }
      const profile = this.profileService.get(body.profileName);
      return detect(body.amplitudes, profile);
    }

    // 内联窗几何：三个数缺一不可，缺项由领域校验直接拒绝。
    return detect(body.amplitudes, {
      guardCells: body.guardCells,
      referenceCellsPerSide: body.referenceCellsPerSide,
      pfa: body.pfa,
    });
  }
}
