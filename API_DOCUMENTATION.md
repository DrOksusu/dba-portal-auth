# DBA Portal Auth Server - API 문서

## 기본 정보

**Base URL:** `http://localhost:3002`

**응답 형식:** JSON

### 공통 응답 구조

#### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}
```

#### 실패 응답
```json
{
  "success": false,
  "message": "에러 메시지"
}
```

---

## 📋 API 엔드포인트 목록

| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/health` | ❌ | 서버 상태 확인 |
| GET | `/auth/google` | ❌ | 구글 로그인 시작 |
| GET | `/auth/google/callback` | ❌ | 구글 콜백 |
| GET | `/auth/kakao` | ❌ | 카카오 로그인 시작 |
| GET | `/auth/kakao/callback` | ❌ | 카카오 콜백 |
| POST | `/auth/send-verification` | ❌ | SMS 인증코드 발송 |
| POST | `/auth/verify-phone` | ❌ | 인증코드 확인 |
| POST | `/auth/complete-social-login` | ❌ | 소셜 로그인 완료 |
| POST | `/auth/refresh` | ❌ | 토큰 갱신 |
| POST | `/auth/logout` | ✅ | 로그아웃 |
| GET | `/auth/me` | ✅ | 내 정보 조회 |
| PUT | `/auth/profile` | ✅ | 프로필 수정 |
| DELETE | `/auth/account` | ✅ | 계정 비활성화 |

---

## 상세 API 명세

### 1. Health Check

**Endpoint:** `GET /health`

**설명:** 서버 상태 확인

**응답:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-10-11T10:30:45.123Z",
    "uptime": 123.456
  },
  "message": "Server is healthy"
}
```

---

### 2. 구글/카카오 로그인 시작

**Endpoint:** 
- `GET /auth/google`
- `GET /auth/kakao`

**설명:** 소셜 로그인 페이지로 리다이렉트

**사용 예시:**
```javascript
// 프론트엔드
window.location.href = 'http://localhost:3002/auth/kakao';
```

---

### 3. SMS 인증코드 발송

**Endpoint:** `POST /auth/send-verification`

**Rate Limit:** 30초에 1회

**요청:**
```json
{
  "phone": "010-1234-5678"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": null,
  "message": "인증 코드가 발송되었습니다."
}
```

---

### 4. 전화번호 인증코드 확인

**Endpoint:** `POST /auth/verify-phone`

**요청:**
```json
{
  "phone": "010-1234-5678",
  "verificationCode": "123456"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "verified": true
  },
  "message": "전화번호 인증이 완료되었습니다."
}
```

---

### 5. 소셜 로그인 완료

**Endpoint:** `POST /auth/complete-social-login`

**요청:**
```json
{
  "phone": "010-1234-5678",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "4488736247",
    "email": "user@kakao.com",
    "name": "홍길동",
    "profileImage": "https://..."
  }
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmgm5zdym0000ueecxt4of73d",
      "phone": "01090184192",
      "name": null,
      "email": null,
      "profileImage": null,
      "isActive": true,
      "createdAt": "2025-10-11T11:00:32.494Z",
      "updatedAt": "2025-10-11T11:00:32.494Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "isNewUser": true
  },
  "message": "로그인이 완료되었습니다."
}
```

**중요:** 
- `accessToken` 유효기간: 15분
- `refreshToken` 유효기간: 7일

---

### 6. 토큰 갱신

**Endpoint:** `POST /auth/refresh`

**요청:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "토큰이 갱신되었습니다."
}
```

---

### 7. 로그아웃

**Endpoint:** `POST /auth/logout`

**인증:** ✅ Bearer Token 필요

**Headers:**
```
Authorization: Bearer {accessToken}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": null,
  "message": "로그아웃이 완료되었습니다."
}
```

---

### 8. 내 정보 조회

**Endpoint:** `GET /auth/me`

**인증:** ✅ Bearer Token 필요

**Headers:**
```
Authorization: Bearer {accessToken}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "id": "cmgm5zdym0000ueecxt4of73d",
    "phone": "01090184192",
    "name": "홍길동",
    "email": "user@example.com",
    "profileImage": "https://...",
    "isActive": true,
    "createdAt": "2025-10-11T11:00:32.494Z",
    "updatedAt": "2025-10-11T11:00:32.494Z",
    "socialAccounts": [
      {
        "provider": "kakao",
        "email": "user@kakao.com",
        "name": "홍길동",
        "profileImage": "https://..."
      }
    ]
  },
  "message": "사용자 정보를 조회했습니다."
}
```

---

### 9. 프로필 수정

**Endpoint:** `PUT /auth/profile`

**인증:** ✅ Bearer Token 필요

**Headers:**
```
Authorization: Bearer {accessToken}
```

**요청:**
```json
{
  "name": "새이름",
  "email": "newemail@example.com"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "id": "cmgm5zdym0000ueecxt4of73d",
    "phone": "01090184192",
    "name": "새이름",
    "email": "newemail@example.com",
    "profileImage": null,
    "isActive": true,
    "createdAt": "2025-10-11T11:00:32.494Z",
    "updatedAt": "2025-10-11T12:30:15.123Z"
  },
  "message": "프로필이 업데이트되었습니다."
}
```

---

### 10. 계정 비활성화

**Endpoint:** `DELETE /auth/account`

**인증:** ✅ Bearer Token 필요

**Headers:**
```
Authorization: Bearer {accessToken}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": null,
  "message": "계정이 비활성화되었습니다."
}
```

---

## 🔐 인증 (Authentication)

### Bearer Token 사용법

```
Authorization: Bearer {accessToken}
```

### JavaScript 예시

```javascript
const token = localStorage.getItem('accessToken');

fetch('http://localhost:3002/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### 자동 토큰 갱신

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3002/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    return true;
  }

  // 갱신 실패 시 로그아웃
  localStorage.clear();
  window.location.href = '/login';
  return false;
}
```

---

## 🔄 인증 플로우

### 신규 사용자

```
1. GET /auth/kakao (브라우저)
2. 카카오 로그인
3. GET /auth/kakao/callback
   → { requirePhoneVerification: true, socialProfile: {...} }
4. POST /auth/send-verification
5. POST /auth/verify-phone
6. POST /auth/complete-social-login
   → 회원가입 완료 + 토큰 발급
```

### 기존 사용자

```
1. GET /auth/kakao (브라우저)
2. 카카오 로그인
3. GET /auth/kakao/callback
   → 프론트엔드로 리다이렉트 (토큰 포함)
```

---

## ⚠️ 에러 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 (토큰 만료/없음) |
| 403 | 권한 없음 |
| 404 | 찾을 수 없음 |
| 429 | 요청 횟수 초과 |
| 500 | 서버 오류 |

---

## 🚦 Rate Limits

| API | 제한 |
|-----|------|
| 일반 | 15분에 100회 |
| 인증 | 15분에 5회 |
| SMS | 30초에 1회 |
| 토큰 갱신 | 1분에 10회 |

---

## 환경 설정

서버 주소는 환경에 따라 변경:
- 개발: `http://localhost:3002`
- 운영: 실제 서버 주소

CORS 허용 주소: `.env` 파일의 `CLIENT_URL`
