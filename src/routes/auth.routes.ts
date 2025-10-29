import { Router } from 'express';
import passport from '../middleware/passport.middleware';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { authLimiter, smsLimiter, refreshTokenLimiter } from '../middleware/rate-limit.middleware';
import { ResponseUtil } from '../utils/response.util';

const router = Router();

// OAuth 인증 시작
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/kakao', passport.authenticate('kakao'));

// OAuth 콜백 처리
router.get('/google/callback', 
  authLimiter,
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const authResult = req.user as any;
    
    if (authResult.isNewUser) {
      // 새 사용자 - 전화번호 인증 필요
      return ResponseUtil.success(res, {
        requirePhoneVerification: true,
        socialProfile: authResult.socialProfile,
        tempToken: 'temp_' + Date.now() // 임시 토큰 (실제 구현 시 보안 강화 필요)
      }, '전화번호 인증이 필요합니다.');
    } else {
      // 기존 사용자 - 바로 로그인
      return res.redirect(`${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`);
    }
  }
);

router.get('/kakao/callback',
  authLimiter,
  passport.authenticate('kakao', { session: false }),
  (req, res) => {
    const authResult = req.user as any;
    
    if (authResult.skipPhoneVerification) {
      // 카카오에서 전화번호를 받아 바로 계정 생성된 경우
      return res.redirect(`${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`);
    } else if (authResult.isNewUser) {
      // 새 사용자 - 전화번호 인증 필요
      return ResponseUtil.success(res, {
        requirePhoneVerification: true,
        socialProfile: authResult.socialProfile,
        tempToken: 'temp_' + Date.now()
      }, '전화번호 인증이 필요합니다.');
    } else {
      // 기존 사용자 - 바로 로그인
      return res.redirect(`${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`);
    }
  }
);

// 전화번호 인증
router.post('/send-verification', smsLimiter, AuthController.sendVerificationCode);
router.post('/verify-phone', authLimiter, AuthController.verifyPhoneCode);

// 소셜 로그인 완료 (전화번호 인증 후)
router.post('/complete-social-login', authLimiter, AuthController.completeSocialLogin);

// 토큰 관련
router.post('/refresh', refreshTokenLimiter, AuthController.refreshToken);
router.post('/logout', AuthMiddleware.verifyToken, AuthController.logout);

// 사용자 정보
router.get('/me', AuthMiddleware.verifyToken, AuthController.getCurrentUser);
router.put('/profile', AuthMiddleware.verifyToken, AuthController.updateProfile);
router.delete('/account', AuthMiddleware.verifyToken, AuthController.deactivateAccount);

export default router;
