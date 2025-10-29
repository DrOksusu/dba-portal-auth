import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';

export class JwtUtil {
  private static ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
  private static REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static ACCESS_EXPIRES_IN = '15m';
  private static REFRESH_EXPIRES_IN = '7d';

  static generateAccessToken(userId: string): string {
    const payload: JwtPayload = {
      userId,
      type: 'access'
    };
    return jwt.sign(payload, this.ACCESS_SECRET, { expiresIn: this.ACCESS_EXPIRES_IN } as jwt.SignOptions);
  }

  static generateRefreshToken(userId: string): string {
    const payload: JwtPayload = {
      userId,
      type: 'refresh'
    };
    return jwt.sign(payload, this.REFRESH_SECRET, { expiresIn: this.REFRESH_EXPIRES_IN } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.ACCESS_SECRET) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.REFRESH_SECRET) as JwtPayload;
  }

  static getTokenExpirationDate(token: string): Date {
    const decoded = jwt.decode(token) as any;
    return new Date(decoded.exp * 1000);
  }

  static generateTokenPair(userId: string) {
    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: this.generateRefreshToken(userId)
    };
  }
}
