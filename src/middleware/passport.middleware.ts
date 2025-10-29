import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { UserService } from '../services/user.service';
import { GoogleProfile, KakaoProfile, SocialProfile } from '../types/auth.types';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'http://localhost:3002/auth/google/callback'
}, async (accessToken, refreshToken, profile: GoogleProfile, done) => {
  try {
    const socialProfile: SocialProfile = {
      provider: 'google',
      providerId: String(profile.id),
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      profileImage: profile.photos?.[0]?.value
    };

    // 기존 소셜 계정으로 사용자 찾기
    let user = await UserService.findUserBySocialAccount('google', String(profile.id));

    if (!user) {
      // 새로운 사용자 - 세션에 소셜 프로필 저장 (전화번호 인증 후 계정 생성)
      return done(null, { socialProfile, isNewUser: true });
    }

    // 기존 사용자 - 소셜 계정 정보 업데이트
    await UserService.updateSocialAccount('google', String(profile.id), socialProfile);
    
    return done(null, { user, socialProfile, isNewUser: false });
  } catch (error) {
    return done(error);
  }
}));

// Kakao OAuth Strategy
passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET!,
  callbackURL: 'http://localhost:3002/auth/kakao/callback'
}, async (accessToken: string, refreshToken: string, profile: KakaoProfile, done: any) => {
  try {
    const socialProfile: SocialProfile = {
      provider: 'kakao',
      providerId: String(profile.id),
      email: profile.kakao_account?.email,
      name: profile.kakao_account?.profile?.nickname,
      profileImage: profile.kakao_account?.profile?.profile_image_url
    };

    // 카카오에서 전화번호 정보 가져오기 (가능한 경우)
    const phone = profile.kakao_account?.phone_number;

    // 기존 소셜 계정으로 사용자 찾기
    let user = await UserService.findUserBySocialAccount('kakao', String(profile.id));

    if (!user && phone) {
      // 전화번호로 기존 사용자 찾기 (계정 통합)
      user = await UserService.findUserByPhone(phone);
      
      if (user) {
        // 기존 사용자에 카카오 계정 연결
        await UserService.linkSocialAccount(user.id, socialProfile);
        return done(null, { user, socialProfile, isNewUser: false, accountLinked: true });
      }
    }

    if (!user) {
      // 새로운 사용자
      if (phone) {
        // 카카오에서 전화번호를 받은 경우 바로 계정 생성
        user = await UserService.createUser(phone, socialProfile.name, socialProfile.email, socialProfile.profileImage);
        await UserService.linkSocialAccount(user.id, socialProfile);
        return done(null, { user, socialProfile, isNewUser: true, skipPhoneVerification: true });
      } else {
        // 전화번호가 없는 경우 전화번호 인증 필요
        return done(null, { socialProfile, isNewUser: true });
      }
    }

    // 기존 사용자 - 소셜 계정 정보 업데이트
    await UserService.updateSocialAccount('kakao', String(profile.id), socialProfile);
    
    return done(null, { user, socialProfile, isNewUser: false });
  } catch (error) {
    return done(error);
  }
}));

// 세션 직렬화/역직렬화 (실제로는 JWT를 사용하므로 간단하게 처리)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
