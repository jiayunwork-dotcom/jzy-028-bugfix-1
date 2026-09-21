import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CfarValidationError } from './domain/errors';
import {
  ProfileAlreadyExistsError,
  ProfileNotFoundError,
} from './window-profile.service';

/**
 * 把领域层错误映射成 HTTP 状态码，领域代码本身不依赖 NestJS：
 * - CfarValidationError（缺项、Pfa 越界、负幅度、窗长 0 等）-> 400
 * - ProfileNotFoundError（点了没登记的窗规名）-> 404
 * - ProfileAlreadyExistsError（窗规重名）-> 409
 */
@Catch(CfarValidationError, ProfileNotFoundError, ProfileAlreadyExistsError)
export class CfarExceptionFilter implements ExceptionFilter {
  catch(
    exception: CfarValidationError | ProfileNotFoundError | ProfileAlreadyExistsError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status: number;
    if (exception instanceof ProfileNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ProfileAlreadyExistsError) {
      status = HttpStatus.CONFLICT;
    } else {
      status = HttpStatus.BAD_REQUEST;
    }

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
