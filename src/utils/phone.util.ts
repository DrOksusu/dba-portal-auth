export class PhoneUtil {
  /**
   * 전화번호를 표준 형식으로 변환 (국가 코드 제거, 하이픈 제거)
   * 예: +82-10-1234-5678 -> 01012345678
   */
  static normalizePhoneNumber(phone: string): string {
    // 국가 코드 제거 (+82, 82)
    let normalized = phone.replace(/^\+?82-?/, '');
    
    // 하이픈, 공백, 괄호 제거
    normalized = normalized.replace(/[-\s()]/g, '');
    
    // 010으로 시작하지 않으면 010을 앞에 붙임 (예: 1012345678 -> 01012345678)
    if (normalized.length === 10 && !normalized.startsWith('010')) {
      normalized = '0' + normalized;
    }
    
    return normalized;
  }

  /**
   * 전화번호 유효성 검사
   */
  static isValidPhoneNumber(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone);
    
    // 한국 휴대폰 번호 패턴 (010, 011, 016, 017, 018, 019)
    const phoneRegex = /^01[0-9]\d{8}$/;
    
    return phoneRegex.test(normalized);
  }

  /**
   * 표시용 전화번호 형식으로 변환
   * 예: 01012345678 -> 010-1234-5678
   */
  static formatPhoneNumber(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    
    if (normalized.length === 11) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
    }
    
    return phone; // 형식이 맞지 않으면 원본 반환
  }

  /**
   * 인증 코드 생성 (6자리 숫자)
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
