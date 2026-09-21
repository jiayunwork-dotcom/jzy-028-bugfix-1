/**
 * 领域层参数错误。HTTP 层统一映射成 400，领域代码不依赖 NestJS。
 */
export class CfarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CfarValidationError';
  }
}
