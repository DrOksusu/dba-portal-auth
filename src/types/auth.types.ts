export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialProfile {
  provider: 'google' | 'kakao';
  providerId: string;
  email?: string;
  name?: string;
  profileImage?: string;
}

export interface GoogleProfile {
  id: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  displayName?: string;
  name?: { familyName?: string; givenName?: string };
  photos?: Array<{ value: string }>;
}

export interface KakaoProfile {
  id: string;
  kakao_account?: {
    email?: string;
    phone_number?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

export interface PhoneVerificationRequest {
  phone: string;
}

export interface PhoneVerificationConfirm {
  phone: string;
  verificationCode: string;
}

export interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}
