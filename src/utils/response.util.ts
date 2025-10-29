import { Response } from 'express';
import { ApiResponse } from '../types/auth.types';

export class ResponseUtil {
  static success<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      status: 'success',
      data,
      message
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode: number = 400): Response {
    const response: ApiResponse = {
      status: 'error',
      message
    };
    return res.status(statusCode).json(response);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return this.error(res, message, 404);
  }

  static serverError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }
}
