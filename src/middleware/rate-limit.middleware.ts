import rateLimit from 'express-rate-limit';
import { ResponseUtil } from '../utils/response.util';

/**
 * 일반적인 API 요청 제한
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 15분당 최대 100회
  message: {
    status: 'error',
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 인증 관련 요청 제한 (더 엄격)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분당 최대 5회
  message: {
    status: 'error',
    message: '인증 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * SMS 발송 요청 제한
 */
export const smsLimiter = rateLimit({
  windowMs: 30 * 1000, // 30초
  max: 1, // 30초당 최대 1회
  message: {
    status: 'error',
    message: 'SMS 발송은 30초에 1회만 가능합니다.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IP 기반 제한만 사용 (전화번호는 별도 로직에서 처리)
  skipFailedRequests: false
});

/**
 * 토큰 갱신 요청 제한
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 1분당 최대 10회
  message: {
    status: 'error',
    message: '토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 사용자별 요청 제한 (인증된 사용자)
 */
export const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 200, // 15분당 최대 200회
  message: {
    status: 'error',
    message: '사용자별 요청 한도를 초과했습니다.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IP 기반 제한 사용
  skipFailedRequests: false
});
