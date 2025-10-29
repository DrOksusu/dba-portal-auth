# API 엔드포인트 정리

## 📍 서버 정보

- **Base URL**: `http://localhost:3002`
- **포트**: `3002`

---

## 🔐 소셜 로그인 엔드포인트

### 정의 위치

**파일**: `src/routes/auth.routes.ts` (11-59번 라인)
**라우트 등록**: `src/app.ts` 73번 라인 `app.use('/auth', authRoutes)`

---

## 📋 전체 엔드포인트 목록

### 1. 소셜 로그인 시작 (GET)

#### Google 로그인
```
GET http://localhost:3002/auth/google
```

**정의**: `src/routes/auth.routes.ts:11-13`
```typescript
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));
```

**사용법 (프론트엔드)**:
```javascript
// 브라우저에서 리다이렉트
window.location.href = 'http://localhost:3002/auth/google';

// 또는 a 태그
<a href="http://localhost:3002/auth/google">Google 로그인</a>
```

---

#### Kakao 로그인
```
GET http://localhost:3002/auth/kakao
```

**정의**: `src/routes/auth.routes.ts:15`
```typescript
router.get('/kakao', passport.authenticate('kakao'));
```

**사용법 (프론트엔드)**:
```javascript
// 브라우저에서 리다이렉트
window.location.href = 'http://localhost:3002/auth/kakao';

// 또는 a 태그
<a href="http://localhost:3002/auth/kakao">Kakao 로그인</a>
```

---

### 2. OAuth 콜백 (GET) - 자동 호출됨

#### Google 콜백
```
GET http://localhost:3002/auth/google/callback
```

**정의**: `src/routes/auth.routes.ts:18-36`

**동작**:
- Google OAuth 인증 후 자동으로 호출됨
- **신규 사용자**: JSON 응답 (전화번호 인증 필요)
- **기존 사용자**: 프론트엔드로 리다이렉트 (즉시 로그인)

**응답 (신규 사용자)**:
```json
{
  "success": true,
  "data": {
    "requirePhoneVerification": true,
    "socialProfile": {
      "provider": "google",
      "providerId": "...",
      "email": "...",
      "name": "...",
      "profileImage": "..."
    },
    "tempToken": "temp_..."
  },
  "message": "전화번호 인증이 필요합니다."
}
```

**응답 (기존 사용자)**:
```
Redirect to: ${CLIENT_URL}/auth/success?user={userData}
```

---

#### Kakao 콜백
```
GET http://localhost:3002/auth/kakao/callback
```

**정의**: `src/routes/auth.routes.ts:38-59`

**동작**: Google 콜백과 동일

---

### 3. 전화번호 인증 (POST)

#### SMS 인증 코드 발송
```
POST http://localhost:3002/auth/send-verification
Content-Type: application/json

{
  "phone": "010-1234-5678"
}
```

**정의**: `src/routes/auth.routes.ts:62`
```typescript
router.post('/send-verification', smsLimiter, AuthController.sendVerificationCode);
```

**컨트롤러**: `src/controllers/auth.controller.ts:14-36`

---

#### 전화번호 인증 확인
```
POST http://localhost:3002/auth/verify-phone
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "123456"
}
```

**정의**: `src/routes/auth.routes.ts:63`
```typescript
router.post('/verify-phone', authLimiter, AuthController.verifyPhoneCode);
```

**컨트롤러**: `src/controllers/auth.controller.ts:41-57`

---

### 4. 회원가입 완료 (POST)

#### 소셜 로그인 완료
```
POST http://localhost:3002/auth/complete-social-login
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "google",
    "providerId": "...",
    "email": "...",
    "name": "...",
    "profileImage": "..."
  }
}
```

**정의**: `src/routes/auth.routes.ts:66`
```typescript
router.post('/complete-social-login', authLimiter, AuthController.completeSocialLogin);
```

**컨트롤러**: `src/controllers/auth.controller.ts:62-126`

---

### 5. 토큰 관리 (POST)

#### 토큰 갱신
```
POST http://localhost:3002/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

**정의**: `src/routes/auth.routes.ts:69`
```typescript
router.post('/refresh', refreshTokenLimiter, AuthController.refreshToken);
```

**컨트롤러**: `src/controllers/auth.controller.ts:131-147`

---

#### 로그아웃
```
POST http://localhost:3002/auth/logout
Authorization: Bearer {accessToken}
```

**정의**: `src/routes/auth.routes.ts:70`
```typescript
router.post('/logout', AuthMiddleware.verifyToken, AuthController.logout);
```

**컨트롤러**: `src/controllers/auth.controller.ts:152-167`

---

### 6. 사용자 정보 관리

#### 내 정보 조회 (GET)
```
GET http://localhost:3002/auth/me
Authorization: Bearer {accessToken}
```

**정의**: `src/routes/auth.routes.ts:73`
```typescript
router.get('/me', AuthMiddleware.verifyToken, AuthController.getCurrentUser);
```

**컨트롤러**: `src/controllers/auth.controller.ts:172-201`

---

#### 프로필 수정 (PUT)
```
PUT http://localhost:3002/auth/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "새 이름",
  "email": "new@email.com"
}
```

**정의**: `src/routes/auth.routes.ts:74`
```typescript
router.put('/profile', AuthMiddleware.verifyToken, AuthController.updateProfile);
```

**컨트롤러**: `src/controllers/auth.controller.ts:206-226`

---

#### 계정 비활성화 (DELETE)
```
DELETE http://localhost:3002/auth/account
Authorization: Bearer {accessToken}
```

**정의**: `src/routes/auth.routes.ts:75`
```typescript
router.delete('/account', AuthMiddleware.verifyToken, AuthController.deactivateAccount);
```

**컨트롤러**: `src/controllers/auth.controller.ts:231-240`

---

### 7. 헬스 체크

```
GET http://localhost:3002/health
```

**정의**: `src/app.ts:64-70`
```typescript
app.get('/health', (req, res) => {
  ResponseUtil.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Server is healthy');
});
```

---

## 🗂️ 파일 구조

```
src/
├── app.ts                          # Express 앱 설정, 라우트 등록
│   └── line 73: app.use('/auth', authRoutes)
│
├── routes/
│   └── auth.routes.ts              # 인증 관련 라우트 정의
│       ├── line 11-13:  GET  /auth/google
│       ├── line 15:     GET  /auth/kakao
│       ├── line 18-36:  GET  /auth/google/callback
│       ├── line 38-59:  GET  /auth/kakao/callback
│       ├── line 62:     POST /auth/send-verification
│       ├── line 63:     POST /auth/verify-phone
│       ├── line 66:     POST /auth/complete-social-login
│       ├── line 69:     POST /auth/refresh
│       ├── line 70:     POST /auth/logout
│       ├── line 73:     GET  /auth/me
│       ├── line 74:     PUT  /auth/profile
│       └── line 75:     DELETE /auth/account
│
├── controllers/
│   └── auth.controller.ts          # 인증 로직 구현
│       ├── sendVerificationCode    # SMS 발송
│       ├── verifyPhoneCode         # 전화번호 인증
│       ├── completeSocialLogin     # 회원가입 완료
│       ├── refreshToken            # 토큰 갱신
│       ├── logout                  # 로그아웃
│       ├── getCurrentUser          # 내 정보 조회
│       ├── updateProfile           # 프로필 수정
│       └── deactivateAccount       # 계정 비활성화
│
└── middleware/
    ├── passport.middleware.ts      # Passport 설정
    ├── auth.middleware.ts          # JWT 인증 미들웨어
    └── rate-limit.middleware.ts    # Rate Limiting
```

---

## 🔄 로그인 플로우

### 프론트엔드에서 Google 로그인

```javascript
// 1. 프론트엔드: 로그인 버튼 클릭
window.location.href = 'http://localhost:3002/auth/google';
//                     ↑ src/routes/auth.routes.ts:11

// 2. 인증 서버: Google OAuth 인증 페이지로 리다이렉트

// 3. Google: 사용자 인증 및 동의

// 4. Google: 인증 서버 콜백 호출
//    http://localhost:3002/auth/google/callback?code=...
//    ↑ src/routes/auth.routes.ts:18

// 5. 인증 서버: 사용자 확인
//    - 신규: JSON 응답 (전화번호 인증 필요)
//    - 기존: 프론트엔드로 리다이렉트 (토큰 포함)

// 6. 프론트엔드: 콜백 처리
//    http://localhost:3000/auth/callback?user={userData}
```

---

## 📝 프론트엔드 통합 예시

### React/Next.js

```jsx
// 로그인 페이지
export default function LoginPage() {
  const handleGoogleLogin = () => {
    // src/routes/auth.routes.ts:11 호출
    window.location.href = 'http://localhost:3002/auth/google';
  };

  const handleKakaoLogin = () => {
    // src/routes/auth.routes.ts:15 호출
    window.location.href = 'http://localhost:3002/auth/kakao';
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Google 로그인</button>
      <button onClick={handleKakaoLogin}>Kakao 로그인</button>
    </div>
  );
}
```

### 콜백 처리

```jsx
// /auth/callback 페이지
export default function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = params.get('user');

    if (userData) {
      const user = JSON.parse(decodeURIComponent(userData));

      // 토큰 저장
      localStorage.setItem('accessToken', user.accessToken);
      localStorage.setItem('refreshToken', user.refreshToken);

      // 홈으로 이동
      router.push('/');
    }
  }, []);

  return <div>로그인 처리 중...</div>;
}
```

### API 호출 (내 정보 조회)

```jsx
const fetchMyInfo = async () => {
  const token = localStorage.getItem('accessToken');

  // src/routes/auth.routes.ts:73 호출
  const response = await fetch('http://localhost:3002/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  console.log(data.data); // 사용자 정보
};
```

---

## 🎯 핵심 요약

### 로그인 시작 엔드포인트

| 메서드 | URL | 정의 위치 | 용도 |
|--------|-----|-----------|------|
| GET | `http://localhost:3002/auth/google` | `src/routes/auth.routes.ts:11` | Google 로그인 시작 |
| GET | `http://localhost:3002/auth/kakao` | `src/routes/auth.routes.ts:15` | Kakao 로그인 시작 |

### OAuth 콜백 (자동 호출)

| 메서드 | URL | 정의 위치 | 용도 |
|--------|-----|-----------|------|
| GET | `http://localhost:3002/auth/google/callback` | `src/routes/auth.routes.ts:18` | Google OAuth 콜백 |
| GET | `http://localhost:3002/auth/kakao/callback` | `src/routes/auth.routes.ts:38` | Kakao OAuth 콜백 |

### 회원가입/인증

| 메서드 | URL | 정의 위치 | 용도 |
|--------|-----|-----------|------|
| POST | `http://localhost:3002/auth/send-verification` | `src/routes/auth.routes.ts:62` | SMS 발송 |
| POST | `http://localhost:3002/auth/verify-phone` | `src/routes/auth.routes.ts:63` | 전화번호 인증 |
| POST | `http://localhost:3002/auth/complete-social-login` | `src/routes/auth.routes.ts:66` | 회원가입 완료 |

### 토큰 관리

| 메서드 | URL | 정의 위치 | 용도 |
|--------|-----|-----------|------|
| POST | `http://localhost:3002/auth/refresh` | `src/routes/auth.routes.ts:69` | 토큰 갱신 |
| POST | `http://localhost:3002/auth/logout` | `src/routes/auth.routes.ts:70` | 로그아웃 |

### 사용자 정보

| 메서드 | URL | 정의 위치 | 용도 |
|--------|-----|-----------|------|
| GET | `http://localhost:3002/auth/me` | `src/routes/auth.routes.ts:73` | 내 정보 조회 |
| PUT | `http://localhost:3002/auth/profile` | `src/routes/auth.routes.ts:74` | 프로필 수정 |
| DELETE | `http://localhost:3002/auth/account` | `src/routes/auth.routes.ts:75` | 계정 비활성화 |

---

## 🔍 라우트 등록 흐름

```
1. src/index.ts
   └─> Express 서버 시작

2. src/app.ts
   ├─> line 73: app.use('/auth', authRoutes)
   └─> '/auth' prefix로 authRoutes 등록

3. src/routes/auth.routes.ts
   └─> 각 엔드포인트 정의
       ├─> GET  /google        → passport.authenticate()
       ├─> GET  /kakao         → passport.authenticate()
       ├─> POST /send-verification → AuthController
       └─> ...

결과: http://localhost:3002/auth/{endpoint}
```

---

이제 로그인 엔드포인트가 어디에 정의되어 있는지 명확하게 알 수 있습니다! 🎯
