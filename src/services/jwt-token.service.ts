import { prisma } from './prisma.service';
import { JwtUtil } from '../utils/jwt.util';
import { AuthTokens } from '../types/auth.types';

export class JwtTokenService {
  /**
   * 새 토큰 쌍 발급
   */
  static async generateTokens(userId: string): Promise<AuthTokens> {
    const tokens = JwtUtil.generateTokenPair(userId);
    
    // 기존 토큰들 무효화
    await this.revokeUserTokens(userId);

    // 새 토큰들 저장
    await Promise.all([
      prisma.jwtToken.create({
        data: {
          userId,
          tokenType: 'access',
          token: tokens.accessToken,
          expiresAt: JwtUtil.getTokenExpirationDate(tokens.accessToken)
        }
      }),
      prisma.jwtToken.create({
        data: {
          userId,
          tokenType: 'refresh',
          token: tokens.refreshToken,
          expiresAt: JwtUtil.getTokenExpirationDate(tokens.refreshToken)
        }
      })
    ]);

    return tokens;
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  static async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // 리프레시 토큰 검증
      const payload = JwtUtil.verifyRefreshToken(refreshToken);
      
      // DB에서 토큰 확인 (TEXT 필드이므로 findFirst 사용)
      const tokenRecord = await prisma.jwtToken.findFirst({
        where: {
          token: refreshToken,
          tokenType: 'refresh',
          isRevoked: false,
          expiresAt: {
            gte: new Date()
          }
        }
      });

      if (!tokenRecord || tokenRecord.userId !== payload.userId) {
        return null;
      }

      // 새 토큰 쌍 생성
      return await this.generateTokens(payload.userId);
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      return null;
    }
  }

  /**
   * 토큰 유효성 검사
   */
  static async validateToken(token: string, tokenType: 'access' | 'refresh'): Promise<string | null> {
    try {
      let payload;
      
      if (tokenType === 'access') {
        payload = JwtUtil.verifyAccessToken(token);
      } else {
        payload = JwtUtil.verifyRefreshToken(token);
      }

      // DB에서 토큰 확인
      const tokenRecord = await prisma.jwtToken.findFirst({
        where: {
          token,
          tokenType,
          isRevoked: false,
          expiresAt: {
            gte: new Date()
          }
        }
      });

      if (!tokenRecord || tokenRecord.userId !== payload.userId) {
        return null;
      }

      return payload.userId;
    } catch (error) {
      return null;
    }
  }

  /**
   * 사용자의 모든 토큰 무효화
   */
  static async revokeUserTokens(userId: string): Promise<void> {
    await prisma.jwtToken.updateMany({
      where: {
        userId,
        isRevoked: false
      },
      data: {
        isRevoked: true
      }
    });
  }

  /**
   * 특정 토큰 무효화
   */
  static async revokeToken(token: string): Promise<void> {
    await prisma.jwtToken.updateMany({
      where: {
        token,
        isRevoked: false
      },
      data: {
        isRevoked: true
      }
    });
  }

  /**
   * 만료된 토큰 정리
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.jwtToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }

  /**
   * 사용자의 토큰 사용 이력 조회
   */
  static async getUserTokenHistory(userId: string, limit: number = 10) {
    return await prisma.jwtToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tokenType: true,
        isRevoked: true,
        expiresAt: true,
        createdAt: true
      }
    });
  }
}
