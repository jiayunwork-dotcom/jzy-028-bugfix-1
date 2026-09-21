import { CfarValidationError } from './errors';

/**
 * 判定 v 是否为非负整数（要求真整数，不接受 1.5、NaN、Infinity）。
 */
export function isNonNegativeInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}

/**
 * 校验并归一化窗几何与 Pfa，返回参考单元总数 N。
 *
 * 规则：
 * - Pfa 必须在开区间 (0, 1) 且为有限数；
 * - 保护单元数为非负整数；
 * - 每侧参考数为非负整数，且至少为 1（窗长为 0 直接拒绝）；
 * - N 为两侧参考数之和。
 */
export function validateWindowParams(params: {
  guardCells?: unknown;
  referenceCellsPerSide?: unknown;
  pfa?: unknown;
}): { guardCells: number; referenceCellsPerSide: number; pfa: number; N: number } {
  const { guardCells, referenceCellsPerSide, pfa } = params;

  if (typeof pfa !== 'number' || !Number.isFinite(pfa)) {
    throw new CfarValidationError('pfa must be a finite number');
  }
  if (pfa <= 0 || pfa >= 1) {
    throw new CfarValidationError('pfa must lie in the open interval (0, 1)');
  }

  if (!isNonNegativeInteger(guardCells)) {
    throw new CfarValidationError('guardCells must be a non-negative integer');
  }
  if (!isNonNegativeInteger(referenceCellsPerSide)) {
    throw new CfarValidationError(
      'referenceCellsPerSide must be a non-negative integer',
    );
  }
  // 每侧参考数至少为 1：窗长为 0（一个参考都没有）直接拒绝。
  if (referenceCellsPerSide < 1) {
    throw new CfarValidationError(
      'referenceCellsPerSide must be at least 1 (reference window length must not be 0)',
    );
  }

  return {
    guardCells,
    referenceCellsPerSide,
    pfa,
    N: referenceCellsPerSide * 2,
  };
}

/**
 * 校验一条幅度序列：必须是非空数组，每个元素都是非负有限数。
 */
export function validateAmplitudes(amplitudes: unknown): number[] {
  if (!Array.isArray(amplitudes)) {
    throw new CfarValidationError('amplitudes must be an array of numbers');
  }
  if (amplitudes.length === 0) {
    throw new CfarValidationError('amplitudes must not be empty');
  }
  for (const [i, value] of amplitudes.entries()) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new CfarValidationError(
        `amplitudes[${i}] must be a finite number`,
      );
    }
    if (value < 0) {
      throw new CfarValidationError(`amplitudes[${i}] must not be negative`);
    }
  }
  return amplitudes as number[];
}
