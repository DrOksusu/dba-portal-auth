import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { PhoneVerificationService } from '../services/phone-verification.service';
import { ResponseUtil } from '../utils/response.util';
import { PhoneUtil } from '../utils/phone.util';
import { ErrorMiddleware } from '../middleware/error.middleware';
import { PhoneVerificationRequest, PhoneVerificationConfirm, LoginResponse } from '../types/auth.types';

export class AuthController {
  /**
   * 전화번호 인증 코드 발송
   */
  static sendVerificationCode = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const { phone }: PhoneVerificationRequest = req.body;

      if (!phone) {
        return ResponseUtil.error(res, '전화번호를 입력해주세요.');
      }

      if (!PhoneUtil.isValidPhoneNumber(phone)) {
        return ResponseUtil.error(res, '유효하지 않은 전화번호 형식입니다.');
      }

      // 최근 시도 횟수 확인 (스팸 방지)
      const recentAttempts = await PhoneVerificationService.checkRecentAttempts(phone, 60000);
      if (recentAttempts >= 3) {
        return ResponseUtil.error(res, '인증 시도 횟수를 초과했습니다. 1분 후 다시 시도해주세요.', 429);
      }

      await PhoneVerificationService.sendVerificationCode(phone);

      return ResponseUtil.success(res, null, '인증 코드가 발송되었습니다.');
    }
  );

  /**
   * 전화번호 인증 코드 확인
   */
  static verifyPhoneCode = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const { phone, verificationCode }: PhoneVerificationConfirm = req.body;

      if (!phone || !verificationCode) {
        return ResponseUtil.error(res, '전화번호와 인증 코드를 모두 입력해주세요.');
      }

      const isVerified = await PhoneVerificationService.verifyPhoneCode(phone, verificationCode);

      if (!isVerified) {
        return ResponseUtil.error(res, '유효하지 않은 인증 코드입니다.');
      }

      return ResponseUtil.success(res, { verified: true }, '전화번호 인증이 완료되었습니다.');
    }
  );

  /**
   * 소셜 로그인 완료 처리 (전화번호 인증 후)
   */
  static completeSocialLogin = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const { phone, verificationCode, socialProfile } = req.body;

      if (!phone || !verificationCode || !socialProfile) {
        return ResponseUtil.error(res, '필수 정보가 누락되었습니다.');
      }

      // 전화번호 인증 확인 (새 인증 또는 이미 인증된 경우 모두 허용)
      let isPhoneVerified = await PhoneVerificationService.verifyPhoneCode(phone, verificationCode);

      // 이미 인증된 경우도 허용
      if (!isPhoneVerified) {
        isPhoneVerified = await PhoneVerificationService.isPhoneVerified(phone);
      }

      if (!isPhoneVerified) {
        return ResponseUtil.error(res, '전화번호 인증에 실패했습니다.');
      }

      // 기존 사용자 확인
      let user = await UserService.findUserByPhone(phone);

      if (user) {
        // 기존 사용자에 소셜 계정 연결
        await UserService.linkSocialAccount(user.id, socialProfile);
      } else {
        // 새 사용자 생성
        const newUser = await UserService.createUser(
          phone,
          socialProfile.name,
          socialProfile.email,
          socialProfile.profileImage
        );
        await UserService.linkSocialAccount(newUser.id, socialProfile);

        // 다시 조회하여 socialAccounts와 jwtTokens 포함
        user = await UserService.findUserByPhone(phone);
      }

      if (!user) {
        return ResponseUtil.error(res, '사용자 생성에 실패했습니다.');
      }

      // JWT 토큰 발급
      const tokens = await JwtTokenService.generateTokens(user.id);

      const response: LoginResponse = {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          profileImage: user.profileImage ?? undefined,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens,
        isNewUser: !user
      };

      return ResponseUtil.success(res, response, '로그인이 완료되었습니다.');
    }
  );

  /**
   * 토큰 갱신
   */
  static refreshToken = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ResponseUtil.error(res, '리프레시 토큰을 입력해주세요.');
      }

      const newTokens = await JwtTokenService.refreshTokens(refreshToken);

      if (!newTokens) {
        return ResponseUtil.unauthorized(res, '유효하지 않은 리프레시 토큰입니다.');
      }

      return ResponseUtil.success(res, { tokens: newTokens }, '토큰이 갱신되었습니다.');
    }
  );

  /**
   * 로그아웃
   */
  static logout = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.userId!;
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await JwtTokenService.revokeToken(token);
      }

      // 사용자의 모든 토큰 무효화
      await JwtTokenService.revokeUserTokens(userId);

      return ResponseUtil.success(res, null, '로그아웃이 완료되었습니다.');
    }
  );

  /**
   * 현재 사용자 정보 조회
   */
  static getCurrentUser = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.userId!;

      const user = await UserService.findUserById(userId);

      if (!user) {
        return ResponseUtil.error(res, '사용자를 찾을 수 없습니다.', 404);
      }

      const userProfile = {
        id: user.id,
        phone: user.phone,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        profileImage: user.profileImage ?? undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        socialAccounts: user.socialAccounts.map((account: any) => ({
          provider: account.provider,
          email: account.email,
          name: account.name,
          profileImage: account.profileImage
        }))
      };

      return ResponseUtil.success(res, userProfile, '사용자 정보를 조회했습니다.');
    }
  );

  /**
   * 사용자 정보 업데이트
   */
  static updateProfile = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.userId!;
      const { name, email } = req.body;

      const updatedUser = await UserService.updateUser(userId, { name, email });

      const userProfile = {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name ?? undefined,
        email: updatedUser.email ?? undefined,
        profileImage: updatedUser.profileImage ?? undefined,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      return ResponseUtil.success(res, userProfile, '프로필이 업데이트되었습니다.');
    }
  );

  /**
   * 계정 비활성화
   */
  static deactivateAccount = ErrorMiddleware.asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.userId!;

      await UserService.deactivateUser(userId);
      await JwtTokenService.revokeUserTokens(userId);

      return ResponseUtil.success(res, null, '계정이 비활성화되었습니다.');
    }
  );
}
