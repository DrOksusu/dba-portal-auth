# 🔐 DBA Portal Auth API 가이드

프론트엔드에서 인증 서버를 사용하기 위한 완전한 API 문서입니다.

## 📌 기본 정보

```
Base URL: https://your-app-runner-url.awsapprunner.com
Content-Type: application/json
```

## 🔄 인증 플로우

### 전체 흐름도

```
사용자 → 소셜 로그인 버튼 클릭
  ↓
/auth/google 또는 /auth/kakao (리다이렉트)
  ↓
OAuth 제공자 로그인 페이지
  ↓
/auth/google/callback 또는 /auth/kakao/callback
  ↓
[신규 사용자] → 전화번호 인증 필요
  ↓
POST /auth/send-verification (SMS 발송)
  ↓
POST /auth/verify-phone (인증 코드 확인)
  ↓
POST /auth/complete-social-login (로그인 완료)
  ↓
[기존 사용자] → CLIENT_URL로 리다이렉트 (토큰 포함)
  ↓
로그인 완료!
```

---

## 📡 API 엔드포인트

### 1. 헬스체크

**목적:** 서버 상태 확인

```http
GET /health
```

**응답 예시:**
```json
{
  "status": "ok"
}
```

---

## 🔐 인증 관련 API

### 2. 구글 로그인 시작

**목적:** 구글 OAuth 인증 시작

```http
GET /auth/google
```

**사용 방법:**
```javascript
// React/Next.js 예시
const handleGoogleLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/google`;
};
```

**프로세스:**
1. 구글 로그인 페이지로 리다이렉트
2. 사용자 인증 후 `/auth/google/callback`으로 리턴
3. 신규 사용자: 전화번호 인증 필요
4. 기존 사용자: `CLIENT_URL/auth/success?user={userInfo}`로 리다이렉트

---

### 3. 카카오 로그인 시작

**목적:** 카카오 OAuth 인증 시작

```http
GET /auth/kakao
```

**사용 방법:**
```javascript
const handleKakaoLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/kakao`;
};
```

**프로세스:**
1. 카카오 로그인 페이지로 리다이렉트
2. 사용자 인증 후 `/auth/kakao/callback`으로 리턴
3. 카카오에서 전화번호 제공 시: 즉시 로그인 완료
4. 전화번호 없는 경우: 전화번호 인증 필요

---

### 4. 구글 OAuth 콜백 (내부 처리)

```http
GET /auth/google/callback
```

**응답 (신규 사용자):**
```json
{
  "success": true,
  "message": "전화번호 인증이 필요합니다.",
  "data": {
    "requirePhoneVerification": true,
    "socialProfile": {
      "provider": "google",
      "providerId": "123456789",
      "email": "user@gmail.com",
      "name": "홍길동",
      "profileImage": "https://..."
    },
    "tempToken": "temp_1234567890"
  }
}
```

**응답 (기존 사용자):**
```
Redirect → CLIENT_URL/auth/success?user={encodeURIComponent(JSON.stringify(userInfo))}
```

---

### 5. 카카오 OAuth 콜백 (내부 처리)

```http
GET /auth/kakao/callback
```

**응답 형식:** 구글 콜백과 동일

---

### 6. SMS 인증 코드 발송

**목적:** 전화번호로 인증 코드 전송

```http
POST /auth/send-verification
```

**요청 Body:**
```json
{
  "phone": "01012345678"
}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다.",
  "data": null
}
```

**응답 실패 (너무 많은 시도):**
```json
{
  "success": false,
  "message": "인증 시도 횟수를 초과했습니다. 1분 후 다시 시도해주세요."
}
```

**Rate Limit:** 1분에 3회

**프론트엔드 구현 예시:**
```javascript
const sendVerificationCode = async (phone) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    });
    const data = await response.json();

    if (data.success) {
      alert('인증 코드가 발송되었습니다.');
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### 7. 전화번호 인증 코드 확인

**목적:** 사용자가 입력한 인증 코드 검증

```http
POST /auth/verify-phone
```

**요청 Body:**
```json
{
  "phone": "01012345678",
  "verificationCode": "123456"
}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "전화번호 인증이 완료되었습니다.",
  "data": {
    "verified": true
  }
}
```

**응답 실패:**
```json
{
  "success": false,
  "message": "유효하지 않은 인증 코드입니다."
}
```

---

### 8. 소셜 로그인 완료 (전화번호 인증 후)

**목적:** 전화번호 인증 완료 후 최종 로그인 처리 및 JWT 토큰 발급

```http
POST /auth/complete-social-login
```

**요청 Body:**
```json
{
  "phone": "01012345678",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "google",
    "providerId": "123456789",
    "email": "user@gmail.com",
    "name": "홍길동",
    "profileImage": "https://..."
  }
}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "로그인이 완료되었습니다.",
  "data": {
    "user": {
      "id": "clxxxxx",
      "phone": "01012345678",
      "name": "홍길동",
      "email": "user@gmail.com",
      "profileImage": "https://...",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 604800
    },
    "isNewUser": true
  }
}
```

**토큰 정보:**
- `accessToken`: 15분 유효 (900초)
- `refreshToken`: 7일 유효 (604800초)

**프론트엔드 구현 예시:**
```javascript
const completeSocialLogin = async (phone, verificationCode, socialProfile) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/complete-social-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone,
        verificationCode,
        socialProfile
      })
    });
    const data = await response.json();

    if (data.success) {
      // 토큰 저장
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);

      // 사용자 정보 저장
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // 로그인 완료 처리
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### 9. 토큰 갱신

**목적:** Access Token 만료 시 Refresh Token으로 재발급

```http
POST /auth/refresh
```

**요청 Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 604800
    }
  }
}
```

**응답 실패:**
```json
{
  "success": false,
  "message": "유효하지 않은 리프레시 토큰입니다.",
  "statusCode": 401
}
```

**프론트엔드 구현 예시:**
```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    const data = await response.json();

    if (data.success) {
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      return data.data.tokens.accessToken;
    } else {
      // 로그아웃 처리
      localStorage.clear();
      router.push('/login');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### 10. 로그아웃

**목적:** 현재 사용자의 모든 토큰 무효화

```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 성공:**
```json
{
  "success": true,
  "message": "로그아웃이 완료되었습니다.",
  "data": null
}
```

**프론트엔드 구현 예시:**
```javascript
const logout = async () => {
  const accessToken = localStorage.getItem('accessToken');

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // 로컬 스토리지 클리어
    localStorage.clear();

    // 로그인 페이지로 이동
    router.push('/login');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 👤 사용자 정보 API

### 11. 현재 사용자 정보 조회

**목적:** 로그인한 사용자의 정보 조회

```http
GET /auth/me
Authorization: Bearer {accessToken}
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 성공:**
```json
{
  "success": true,
  "message": "사용자 정보를 조회했습니다.",
  "data": {
    "id": "clxxxxx",
    "phone": "01012345678",
    "name": "홍길동",
    "email": "user@gmail.com",
    "profileImage": "https://...",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "socialAccounts": [
      {
        "provider": "google",
        "email": "user@gmail.com",
        "name": "홍길동",
        "profileImage": "https://..."
      }
    ]
  }
}
```

**프론트엔드 구현 예시:**
```javascript
const getCurrentUser = async () => {
  const accessToken = localStorage.getItem('accessToken');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### 12. 프로필 업데이트

**목적:** 사용자 이름 및 이메일 수정

```http
PUT /auth/profile
Authorization: Bearer {accessToken}
```

**요청 Body:**
```json
{
  "name": "김철수",
  "email": "newmail@example.com"
}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "프로필이 업데이트되었습니다.",
  "data": {
    "id": "clxxxxx",
    "phone": "01012345678",
    "name": "김철수",
    "email": "newmail@example.com",
    "profileImage": "https://...",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 13. 계정 비활성화

**목적:** 사용자 계정 삭제 (비활성화)

```http
DELETE /auth/account
Authorization: Bearer {accessToken}
```

**응답 성공:**
```json
{
  "success": true,
  "message": "계정이 비활성화되었습니다.",
  "data": null
}
```

**주의:**
- 계정이 비활성화되면 모든 토큰이 무효화됩니다
- 실제로는 soft delete (isActive: false)

---

## 🚨 에러 응답 형식

### 공통 에러 구조

```json
{
  "success": false,
  "message": "에러 메시지",
  "statusCode": 400
}
```

### HTTP 상태 코드

| 코드 | 의미 | 예시 |
|------|------|------|
| 200 | 성공 | 정상 처리 |
| 400 | 잘못된 요청 | 필수 파라미터 누락 |
| 401 | 인증 실패 | 토큰 만료, 유효하지 않은 토큰 |
| 404 | 찾을 수 없음 | 사용자 없음 |
| 429 | 너무 많은 요청 | Rate Limit 초과 |
| 500 | 서버 에러 | 내부 서버 오류 |

---

## 🔄 프론트엔드 통합 예시

### React + Context API 예시

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 페이지 로드 시 토큰으로 사용자 정보 가져오기
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          const data = await response.json();

          if (data.success) {
            setUser(data.data);
          } else {
            // 토큰 만료 시 갱신 시도
            await refreshToken();
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 토큰 갱신
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  };

  // 로그인 (소셜 로그인)
  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const loginWithKakao = () => {
    window.location.href = `${API_BASE_URL}/auth/kakao`;
  };

  // 로그아웃
  const logout = async () => {
    const accessToken = localStorage.getItem('accessToken');

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.error('Error:', error);
    }

    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithGoogle,
      loginWithKakao,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Axios Interceptor 설정 (토큰 자동 갱신)

```javascript
// src/utils/axios.js
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL
});

// 요청 인터셉터: 모든 요청에 토큰 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 토큰 갱신
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        if (response.data.success) {
          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (err) {
        // 토큰 갱신 실패 시 로그아웃
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

## 📱 사용 시나리오 예시

### 시나리오 1: 신규 사용자 구글 로그인

```javascript
// 1. 로그인 버튼 클릭
<button onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}>
  구글로 로그인
</button>

// 2. 구글 인증 후 콜백 처리 (프론트엔드)
// URL: /auth/callback?requirePhoneVerification=true&socialProfile={...}

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const requirePhoneVerification = urlParams.get('requirePhoneVerification');

  if (requirePhoneVerification === 'true') {
    // 전화번호 인증 페이지로 이동
    router.push('/auth/phone-verification');
  }
}, []);

// 3. 전화번호 입력 및 인증 코드 발송
const handleSendCode = async () => {
  await fetch(`${API_BASE_URL}/auth/send-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '01012345678' })
  });
};

// 4. 인증 코드 확인
const handleVerifyCode = async () => {
  await fetch(`${API_BASE_URL}/auth/verify-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '01012345678',
      verificationCode: '123456'
    })
  });
};

// 5. 로그인 완료
const handleCompleteLogin = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/complete-social-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '01012345678',
      verificationCode: '123456',
      socialProfile: savedSocialProfile
    })
  });

  const data = await response.json();
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);

  router.push('/dashboard');
};
```

### 시나리오 2: 기존 사용자 카카오 로그인

```javascript
// 1. 로그인 버튼 클릭
<button onClick={() => window.location.href = `${API_BASE_URL}/auth/kakao`}>
  카카오로 로그인
</button>

// 2. 카카오 인증 후 자동으로 CLIENT_URL로 리다이렉트
// URL: /auth/success?user={encodeURIComponent(JSON.stringify(userInfo))}

// 3. 콜백 처리 (프론트엔드)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');

  if (userParam) {
    const userInfo = JSON.parse(decodeURIComponent(userParam));

    // 토큰 저장
    localStorage.setItem('accessToken', userInfo.tokens.accessToken);
    localStorage.setItem('refreshToken', userInfo.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(userInfo.user));

    // 대시보드로 이동
    router.push('/dashboard');
  }
}, []);
```

---

## 🔒 보안 권장사항

### 1. 토큰 저장
```javascript
// ✅ 권장: localStorage (XSS 주의)
localStorage.setItem('accessToken', token);

// ⚠️ 대안: httpOnly 쿠키 (CSRF 주의)
// 서버에서 Set-Cookie로 설정
```

### 2. API 요청 시 항상 HTTPS 사용
```javascript
const API_BASE_URL = 'https://your-domain.com'; // ✅
const API_BASE_URL = 'http://your-domain.com';  // ❌
```

### 3. 토큰 만료 처리
```javascript
// Axios 인터셉터 사용하여 자동 갱신 구현
```

### 4. 민감한 정보 로깅 금지
```javascript
// ❌ 금지
console.log('Access Token:', accessToken);

// ✅ 허용
console.log('Login successful');
```

---

## 📞 문의 및 지원

- GitHub Issues: https://github.com/DrOksusu/dba-portal-auth/issues
- 이 문서에 대한 질문이나 개선 사항이 있으면 이슈를 생성해주세요.

---

## 📝 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2024-01-01 | 1.0.0 | 초기 API 문서 작성 |
