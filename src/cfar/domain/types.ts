/**
 * CA-CFAR 领域模型的共享类型。
 */

/** 一趟滑窗的几何/参数定义。 */
export interface WindowParams {
  /** CUT 每侧的保护单元个数（非负整数），不进参考均值。 */
  guardCells: number;
  /** CUT 每侧参与平均的参考单元个数（>=1 的整数）。 */
  referenceCellsPerSide: number;
  /** 虚警率，必须落在开区间 (0, 1)。 */
  pfa: number;
}

/** 一条距离线跑一趟滑窗的结果。 */
export interface CfarResult {
  /** 逐单元阈值；参考凑不齐的无效单元为 null，绝不补零。 */
  thresholds: (number | null)[];
  /** 逐单元检出标记。 */
  detections: boolean[];
  /** 逐单元无效标记：边缘参考不足为 true，不检出。 */
  invalid: boolean[];
  /** 本趟实际使用的因子 α。 */
  alpha: number;
  /** 本趟参考单元总数 N（两侧之和）。 */
  N: number;
}

/** 具名窗规：窗几何 + Pfa 登记在内存里。 */
export interface WindowProfile extends WindowParams {
  name: string;
}
