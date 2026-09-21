/**
 * 检测请求 DTO。类型故意标 unknown：不依赖全局 ValidationPipe，
 * 所有数值合法性由领域层 validation 统一钉死（含“缺项”检查）。
 */
export class DetectRequestDto {
  /** 非负幅度序列。 */
  amplitudes!: unknown;
  /** 具名窗规：与内联窗几何二选一。 */
  profileName?: unknown;
  guardCells?: unknown;
  referenceCellsPerSide?: unknown;
  pfa?: unknown;
}
