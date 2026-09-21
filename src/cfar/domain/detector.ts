import { computeAlpha } from './alpha';
import { CfarValidationError } from './errors';
import { sliceReferenceWindow } from './reference-window';
import { CfarResult, WindowParams } from './types';
import { validateAmplitudes, validateWindowParams } from './validation';

/**
 * 构造一趟滑窗专用的前缀和。
 *
 * prefix[i+1] = amplitudes[0] + ... + amplitudes[i]，
 * 区间 [start, end]（含端点）的幅度和 = prefix[end + 1] - prefix[start]。
 *
 * 注意：前缀和是纯局部对象，只服务当前这一趟 detect 调用，
 * 随函数返回即被丢弃，绝不跨请求累计。
 */
function buildPrefixSum(amplitudes: number[]): Float64Array {
  const prefix = new Float64Array(amplitudes.length + 1);
  let acc = 0;
  for (let i = 0; i < amplitudes.length; i++) {
    acc += amplitudes[i];
    prefix[i + 1] = acc;
  }
  return prefix;
}

function rangeSum(prefix: Float64Array, start: number, endInclusive: number): number {
  return prefix[endInclusive + 1] - prefix[start];
}

/**
 * 对一条非负幅度距离线跑一趟单元平均 CFAR。
 *
 * 流程：
 * 1. 校验幅度与窗几何（Pfa 开区间、非负整数、每侧参考 >= 1、幅度非负）；
 * 2. α = N·(Pfa^(−1/N) − 1)，N = 2×每侧参考数；
 * 3. 从左到右扫每个 CUT：保护单元与 CUT 不进均值，
 *    只取两侧各 R 个参考单元做算术平均，阈值 T = α·均值；
 * 4. 边缘参考凑不齐的 CUT 标无效（阈值 null、不检出），绝不补零；
 * 5. 幅度严格大于阈值判检出（amplitude > T）。
 */
export function detect(amplitudesInput: unknown, paramsInput: unknown): CfarResult {
  const amplitudes = validateAmplitudes(amplitudesInput);
  const { guardCells, referenceCellsPerSide, pfa, N } =
    validateWindowParams(paramsInput as {
      guardCells?: unknown;
      referenceCellsPerSide?: unknown;
      pfa?: unknown;
    });

  const alpha = computeAlpha(pfa, N);
  const length = amplitudes.length;

  const thresholds: (number | null)[] = new Array(length).fill(null);
  const detections: boolean[] = new Array(length).fill(false);
  const invalid: boolean[] = new Array(length).fill(false);

  // 本趟专用前缀和，函数结束后随之释放。
  const prefix = buildPrefixSum(amplitudes);

  for (let cut = 0; cut < length; cut++) {
    const { valid, window } = sliceReferenceWindow(
      cut,
      length,
      guardCells,
      referenceCellsPerSide,
    );

    if (!valid || window === null) {
      // 边缘参考不足：标无效，不判决，不拿零填。
      invalid[cut] = true;
      continue;
    }

    const leftSum = rangeSum(prefix, window.left[0], window.left[window.left.length - 1]);
    // 右侧参考窗：从紧邻 CUT 的第一个参考单元起，取 R 个。
    const rightRefStart = cut + guardCells + 1 - (guardCells > 0 ? 0 : 1);
    const rightSum = rangeSum(
      prefix,
      rightRefStart,
      rightRefStart + referenceCellsPerSide - 1,
    );
    // 参考只包含两侧参考单元；CUT 与保护单元一律不参与。
    const mean = (leftSum + rightSum) / N;
    const threshold = alpha * mean;
    thresholds[cut] = threshold;
    detections[cut] = amplitudes[cut] > threshold;
  }

  return { thresholds, detections, invalid, alpha, N };
}

/**
 * 便捷封装：已知合法参数时直接调用（主要给测试/内部用）。
 */
export function detectWithParams(amplitudes: number[], params: WindowParams): CfarResult {
  if (!Array.isArray(amplitudes) || amplitudes.some((a) => typeof a !== 'number' || a < 0)) {
    throw new CfarValidationError('amplitudes must be non-negative numbers');
  }
  return detect(amplitudes, params);
}
