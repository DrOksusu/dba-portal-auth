import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ErrorMiddleware {
  /**
   * 전역 에러 핸들러
   */
  static handle(error: AppError, req: Request, res: Response, next: NextFunction) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Prisma 에러 처리
    if (error.name === 'PrismaClientKnownRequestError') {
      return ErrorMiddleware.handlePrismaError(error as any, res);
    }

    // JWT 에러 처리
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.unauthorized(res, '유효하지 않은 토큰입니다.');
    }

    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, '만료된 토큰입니다.');
    }

    // 운영 환경에서는 상세한 에러 정보를 숨김
    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = error.statusCode || 500;
    
    if (statusCode === 500) {
      const message = isDevelopment 
        ? error.message 
        : '서버 내부 오류가 발생했습니다.';
      
      return ResponseUtil.serverError(res, message);
    }

    return res.status(statusCode).json({
      status: 'error',
      message: error.message
    });
  }

  /**
   * Prisma 에러 처리
   */
  private static handlePrismaError(error: any, res: Response) {
    switch (error.code) {
      case 'P2002':
        // 고유 제약 조건 위반
        const field = error.meta?.target?.[0];
        return ResponseUtil.error(res, `이미 사용 중인 ${field}입니다.`, 409);
      
      case 'P2025':
        // 레코드를 찾을 수 없음
        return ResponseUtil.notFound(res, '요청한 데이터를 찾을 수 없습니다.');
      
      case 'P2003':
        // 외래 키 제약 조건 위반
        return ResponseUtil.error(res, '참조 무결성 오류가 발생했습니다.', 409);
      
      default:
        console.error('Unhandled Prisma error:', error);
        return ResponseUtil.serverError(res, '데이터베이스 오류가 발생했습니다.');
    }
  }

  /**
   * 404 에러 핸들러
   */
  static notFound(req: Request, res: Response) {
    ResponseUtil.notFound(res, `경로를 찾을 수 없습니다: ${req.originalUrl}`);
  }

  /**
   * 비동기 에러 캐처
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

/**
 * 커스텀 에러 클래스
 */
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
