import { PhoneUtil } from '../utils/phone.util';

// CoolSMS SDK 2.x 사용
const coolsmsSDK = require('coolsms-node-sdk').default;

export class SmsService {
  private static apiKey = process.env.COOLSMS_API_KEY!;
  private static apiSecret = process.env.COOLSMS_API_SECRET!;

  static async sendVerificationCode(phone: string, verificationCode: string): Promise<boolean> {
    try {
      const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);

      if (!PhoneUtil.isValidPhoneNumber(normalizedPhone)) {
        throw new Error('Invalid phone number format');
      }

      // CoolSMS 인스턴스 생성
      const messageService = new coolsmsSDK(this.apiKey, this.apiSecret);

      const messageData = {
        to: normalizedPhone,
        from: process.env.COOLSMS_SENDER || '01090184192', // 발신번호 (.env에서 가져옴)
        text: `[DBA Portal] 인증번호는 ${verificationCode}입니다. 5분 이내에 입력해주세요.`,
        type: 'SMS'
      };

      // 개발 환경에서도 SMS 발송 (콘솔에도 출력)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SMS 발송 시도] 전화번호: ${normalizedPhone}, 인증코드: ${verificationCode}`);
      }

      const response = await messageService.sendOne(messageData);

      console.log('SMS 발송 응답:', response);

      if (response.statusCode === '2000' || response.statusCode === 2000) {
        console.log('✅ SMS 발송 성공!');
        return true;
      } else {
        console.error('❌ SMS 발송 실패:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ SMS 발송 중 오류:', error);
      if (error instanceof Error) {
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
      }
      return false;
    }
  }
}
