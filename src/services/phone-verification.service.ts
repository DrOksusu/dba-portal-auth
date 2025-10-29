import { prisma } from './prisma.service';
import { SmsService } from './sms.service';
import { PhoneUtil } from '../utils/phone.util';

export class PhoneVerificationService {
  /**
   * 전화번호 인증 코드 발송
   */
  static async sendVerificationCode(phone: string): Promise<boolean> {
    try {
      const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);
      
      if (!PhoneUtil.isValidPhoneNumber(normalizedPhone)) {
        throw new Error('유효하지 않은 전화번호 형식입니다.');
      }

      // 기존 미인증 코드들 삭제
      await prisma.phoneVerification.deleteMany({
        where: {
          phone: normalizedPhone,
          isVerified: false
        }
      });

      // 새 인증 코드 생성
      const verificationCode = PhoneUtil.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료

      // 인증 코드 저장
      await prisma.phoneVerification.create({
        data: {
          phone: normalizedPhone,
          verificationCode,
          expiresAt
        }
      });

      // SMS 발송
      const smsResult = await SmsService.sendVerificationCode(normalizedPhone, verificationCode);
      
      if (!smsResult) {
        throw new Error('SMS 발송에 실패했습니다.');
      }

      return true;
    } catch (error) {
      console.error('전화번호 인증 코드 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 전화번호 인증 코드 확인
   */
  static async verifyPhoneCode(phone: string, verificationCode: string): Promise<boolean> {
    try {
      const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);

      // 인증 코드 조회
      const verification = await prisma.phoneVerification.findFirst({
        where: {
          phone: normalizedPhone,
          verificationCode,
          isVerified: false,
          expiresAt: {
            gte: new Date()
          }
        }
      });

      if (!verification) {
        return false;
      }

      // 인증 완료 처리
      await prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { isVerified: true }
      });

      // 만료된 인증 코드들 정리
      await prisma.phoneVerification.deleteMany({
        where: {
          phone: normalizedPhone,
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return true;
    } catch (error) {
      console.error('전화번호 인증 확인 실패:', error);
      return false;
    }
  }

  /**
   * 전화번호가 인증되었는지 확인
   */
  static async isPhoneVerified(phone: string): Promise<boolean> {
    const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);

    const verification = await prisma.phoneVerification.findFirst({
      where: {
        phone: normalizedPhone,
        isVerified: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return !!verification;
  }

  /**
   * 최근 인증 시도 횟수 확인 (스팸 방지)
   */
  static async checkRecentAttempts(phone: string, timeWindow: number = 60000): Promise<number> {
    const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);
    const since = new Date(Date.now() - timeWindow);

    const count = await prisma.phoneVerification.count({
      where: {
        phone: normalizedPhone,
        createdAt: {
          gte: since
        }
      }
    });

    return count;
  }
}
