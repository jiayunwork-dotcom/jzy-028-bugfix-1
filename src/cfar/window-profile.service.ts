import { Injectable } from '@nestjs/common';
import { CfarValidationError } from './domain/errors';
import { WindowProfile } from './domain/types';
import { validateWindowParams } from './domain/validation';

/**
 * 具名窗规的内存存取。
 *
 * - 启动时通过 seed() 载入默认窗规；
 * - 运行期可追加（add），只存内存、不落库，重启回到启动集合；
 * - 按名取用（get），点到未登记名字抛 NotFoundError（HTTP 404）。
 */
@Injectable()
export class WindowProfileService {
  private readonly profiles = new Map<string, WindowProfile>();

  /** 启动时载入一批窗规（同名覆盖，仅用于初始化）。 */
  seed(seedProfiles: WindowProfile[]): void {
    for (const profile of seedProfiles) {
      const { guardCells, referenceCellsPerSide, pfa } = validateWindowParams(profile);
      this.profiles.set(profile.name, {
        name: profile.name,
        guardCells,
        referenceCellsPerSide,
        pfa,
      });
    }
  }

  /** 运行期追加具名窗规；重名拒绝（由上层映射为 409）。 */
  add(input: {
    name?: unknown;
    guardCells?: unknown;
    referenceCellsPerSide?: unknown;
    pfa?: unknown;
  }): WindowProfile {
    const { name } = input;
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new CfarValidationError('profile name must be a non-empty string');
    }
    const trimmed = name.trim();
    if (this.profiles.has(trimmed)) {
      throw new ProfileAlreadyExistsError(trimmed);
    }
    const { guardCells, referenceCellsPerSide, pfa } = validateWindowParams(input);
    const profile: WindowProfile = {
      name: trimmed,
      guardCells,
      referenceCellsPerSide,
      pfa,
    };
    this.profiles.set(trimmed, profile);
    return profile;
  }

  /** 按名取窗规；未登记抛 NotFoundError，绝不静默回退到默认值。 */
  get(name: string): WindowProfile {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new ProfileNotFoundError(name);
    }
    return profile;
  }

  has(name: string): boolean {
    return this.profiles.has(name);
  }

  list(): WindowProfile[] {
    return [...this.profiles.values()].map((p) => ({ ...p }));
  }
}

/** 窗规未登记，HTTP 层映射为 404。 */
export class ProfileNotFoundError extends Error {
  constructor(name: string) {
    super(`window profile not found: ${name}`);
    this.name = 'ProfileNotFoundError';
  }
}

/** 窗规重名，HTTP 层映射为 409。 */
export class ProfileAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`window profile already exists: ${name}`);
    this.name = 'ProfileAlreadyExistsError';
  }
}
