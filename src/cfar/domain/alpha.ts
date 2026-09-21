import { CfarValidationError } from './errors';
import { validateWindowParams } from './validation';

/**
 * CA-CFAR 的阈值因子 α。
 *
 * 对指数分布噪声功率（瑞利包络）的单元平均 CFAR，判决门限 T = α·μ 满足
 * Pfa 与参考单元总数 N 的钉死关系：
 *
 *   Pfa = (1 + α/N)^(−N)
 *
 * 反解得到：
 *
 *   α = N · (Pfa^(−1/N) − 1)
 *
 * α 必须跟着 Pfa 和 N 变，绝不是与 N 无关的常数。
 *
 * @param pfa 虚警率，开区间 (0, 1)
 * @param N 两侧参考单元总数（= 2 × 每侧参考数），正整数
 */
export function computeAlpha(pfa: number, N: number): number {
  if (typeof pfa !== 'number' || !Number.isFinite(pfa) || pfa <= 0 || pfa >= 1) {
    throw new CfarValidationError('pfa must lie in the open interval (0, 1)');
  }
  if (!Number.isSafeInteger(N) || N <= 0) {
    throw new CfarValidationError('N must be a positive integer');
  }
  return N * (Math.pow(pfa, -1 / N) - 1);
}

/**
 * 从已经过几何校验的参数计算 α（便捷封装，带完整入参校验）。
 */
export function alphaForParams(params: {
  guardCells: number;
  referenceCellsPerSide: number;
  pfa: number;
}): { alpha: number; N: number } {
  const { pfa, N } = validateWindowParams(params);
  return { alpha: computeAlpha(pfa, N), N };
}
