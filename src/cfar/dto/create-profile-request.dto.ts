/** 创建具名窗规请求 DTO；合法性由领域层 validation 统一钉死。 */
export class CreateProfileRequestDto {
  name!: unknown;
  guardCells!: unknown;
  referenceCellsPerSide!: unknown;
  pfa!: unknown;
}
