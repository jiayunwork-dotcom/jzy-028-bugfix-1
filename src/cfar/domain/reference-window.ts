/**
 * 参考窗切片：只负责给定 CUT 位置时，两侧参考单元落在哪些下标上。
 *
 * 以 CUT 为中心的一维几何（G = 保护单元数/侧，R = 每侧参考数）：
 *
 *   左参考            左保护  CUT  右保护            右参考
 *  [i-G-R, i-G-1]  [i-G, i-1] [i] [i+1, i+G]  [i+G+1, i+G+R]
 *
 * 目标 CUT 本身和保护单元都不在参考下标里，杜绝把目标算进均值顶高阈值。
 */
export interface ReferenceWindow {
  /** 左侧参考单元下标，升序。 */
  left: number[];
  /** 右侧参考单元下标，升序。 */
  right: number[];
}

/**
 * 计算第 cutIndex 个 CUT 的参考窗。
 *
 * 任一侧的参考单元只要有一个越出 [0, length)，就判定该 CUT 无效
 * （valid=false），调用方必须放弃本单元判决，绝不允许拿零填缺失参考。
 */
export function sliceReferenceWindow(
  cutIndex: number,
  length: number,
  guardCells: number,
  referenceCellsPerSide: number,
): { valid: boolean; window: ReferenceWindow | null } {
  const R = referenceCellsPerSide;
  const G = guardCells;

  const leftStart = cutIndex - G - R;
  const leftEnd = cutIndex - G - 1;
  const rightStart = cutIndex + G + 1;
  const rightEnd = cutIndex + G + R;

  // 两侧参考都必须完整落在序列范围内，缺一个都算无效，不补零。
  if (leftStart < 0 || rightEnd >= length) {
    return { valid: false, window: null };
  }

  const left: number[] = [];
  for (let i = leftStart; i <= leftEnd; i++) {
    left.push(i);
  }
  const right: number[] = [];
  for (let i = rightStart; i <= rightEnd; i++) {
    right.push(i);
  }
  return { valid: true, window: { left, right } };
}
