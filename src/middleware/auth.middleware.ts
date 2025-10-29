import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../services/jwt-token.service';
import { UserService } from '../services/user.service';
import { ResponseUtil } from '../utils/response.util';

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export class AuthMiddleware {
  /**
   * JWT 토큰 검증 미들웨어
   */
  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtil.unauthorized(res, '인증 토큰이 필요합니다.');
      }

      const token = authHeader.substring(7); // 'Bearer ' 제거
      
      const userId = await JwtTokenService.validateToken(token, 'access');
      
      if (!userId) {
        return ResponseUtil.unauthorized(res, '유효하지 않은 토큰입니다.');
      }

      // 사용자 정보 조회
      const user = await UserService.findUserById(userId);

      if (!user || !user.isActive) {
        return ResponseUtil.unauthorized(res, '비활성화된 사용자입니다.');
      }

      req.userId = userId;

      next();
    } catch (error) {
      console.error('토큰 검증 오류:', error);
      return ResponseUtil.unauthorized(res, '토큰 검증에 실패했습니다.');
    }
  }

  /**
   * 선택적 JWT 토큰 검증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
   */
  static async optionalVerifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);
      const userId = await JwtTokenService.validateToken(token, 'access');
      
      if (userId) {
        const user = await UserService.findUserById(userId);
        if (user && user.isActive) {
          req.userId = userId;
        }
      }
      
      next();
    } catch (error) {
      // 선택적 인증에서는 오류가 있어도 계속 진행
      next();
    }
  }

  /**
   * 관리자 권한 확인 미들웨어 (추후 확장 가능)
   */
  static async requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
      return ResponseUtil.unauthorized(res, '인증이 필요합니다.');
    }

    // 현재는 모든 사용자가 동일한 권한을 가지므로 통과
    // 추후 role 기반 권한 시스템 구현 시 수정 필요
    next();
  }

  /**
   * 사용자 활성화 상태 확인 미들웨어
   */
  static async requireActiveUser(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
      return ResponseUtil.unauthorized(res, '인증이 필요합니다.');
    }

    const user = await UserService.findUserById(req.userId);

    if (!user || !user.isActive) {
      return ResponseUtil.forbidden(res, '비활성화된 계정입니다.');
    }

    next();
  }
}
