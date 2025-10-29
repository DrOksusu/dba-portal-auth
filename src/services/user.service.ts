import { prisma } from './prisma.service';
import { SocialProfile, UserProfile } from '../types/auth.types';
import { PhoneUtil } from '../utils/phone.util';

export class UserService {
  /**
   * 전화번호로 사용자 찾기
   */
  static async findUserByPhone(phone: string) {
    const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);
    return await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        socialAccounts: true,
        jwtTokens: {
          where: { isRevoked: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * 사용자 ID로 사용자 찾기
   */
  static async findUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: true
      }
    });
  }

  /**
   * 소셜 계정으로 사용자 찾기
   */
  static async findUserBySocialAccount(provider: string, providerId: string) {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId
        }
      },
      include: {
        user: {
          include: {
            socialAccounts: true
          }
        }
      }
    });

    return socialAccount?.user || null;
  }

  /**
   * 새 사용자 생성
   */
  static async createUser(phone: string, name?: string, email?: string, profileImage?: string) {
    const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);
    
    return await prisma.user.create({
      data: {
        phone: normalizedPhone,
        name,
        email,
        profileImage
      },
      include: {
        socialAccounts: true
      }
    });
  }

  /**
   * 기존 사용자에 소셜 계정 연결
   */
  static async linkSocialAccount(userId: string, socialProfile: SocialProfile) {
    return await prisma.socialAccount.create({
      data: {
        userId,
        provider: socialProfile.provider,
        providerId: socialProfile.providerId,
        email: socialProfile.email,
        name: socialProfile.name,
        profileImage: socialProfile.profileImage
      }
    });
  }

  /**
   * 소셜 계정 정보 업데이트
   */
  static async updateSocialAccount(provider: string, providerId: string, socialProfile: Partial<SocialProfile>) {
    return await prisma.socialAccount.update({
      where: {
        provider_providerId: {
          provider,
          providerId
        }
      },
      data: {
        email: socialProfile.email,
        name: socialProfile.name,
        profileImage: socialProfile.profileImage
      }
    });
  }

  /**
   * 사용자 정보 업데이트
   */
  static async updateUser(userId: string, data: Partial<UserProfile>) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        profileImage: data.profileImage
      },
      include: {
        socialAccounts: true
      }
    });
  }

  /**
   * 사용자 비활성화
   */
  static async deactivateUser(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
  }
}
