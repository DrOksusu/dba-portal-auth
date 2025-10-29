# isNewUser 보안 분석 - 해커가 조작 가능한가?

## ❓ 질문

**해커가 `isNewUser`를 `false`로 조작해서 Google 로그인 없이 기존 사용자처럼 행동할 수 있을까?**

---

## 🛡️ 답변: 불가능합니다!

**`isNewUser`는 서버 내부에서만 설정되는 값이므로 클라이언트(해커)가 조작할 수 없습니다.**

---

## 🔍 왜 불가능한가?

### 1. `isNewUser`는 서버 내부 변수

`isNewUser`는 클라이언트에서 전송되는 값이 **아닙니다**.

```typescript
// ❌ 클라이언트에서 이런 식으로 보낼 수 없음
fetch('http://localhost:3002/auth/google/callback', {
  method: 'POST',
  body: JSON.stringify({
    isNewUser: false  // ← 이렇게 보내도 무시됨!
  })
});
```

**`isNewUser`는 Passport 미들웨어 내부에서만 생성됩니다.**

---

### 2. OAuth 인증 없이는 콜백에 접근 불가

**플로우 분석**:

```
1. 클라이언트: GET /auth/google
   ↓
2. 서버: Google OAuth 페이지로 리다이렉트
   ↓
3. Google: 사용자 인증
   ↓
4. Google: 서버 콜백 호출 (인증 코드 포함)
   GET /auth/google/callback?code={인증코드}
   ↓
5. 서버: Google에 인증 코드 검증
   ↓
6. Google: 유효하면 사용자 정보 반환
   ↓
7. 서버: Passport 전략에서 isNewUser 설정 ← 여기서만 설정!
```

**핵심**:
- Google OAuth 인증 없이는 step 4-7에 도달할 수 없음
- 해커가 직접 `/auth/google/callback`을 호출해도 인증 코드가 없으면 실패

---

### 3. Passport가 Google에서 직접 사용자 정보 가져옴

**코드 분석**: `src/middleware/passport.middleware.ts:8-37`

```typescript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'http://localhost:3002/auth/google/callback'
}, async (accessToken, refreshToken, profile: GoogleProfile, done) => {
  // 🔒 이 함수는 Google OAuth 인증이 성공한 경우에만 실행됨!

  try {
    const socialProfile: SocialProfile = {
      provider: 'google',
      providerId: String(profile.id),  // ← Google이 제공한 ID
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      profileImage: profile.photos?.[0]?.value
    };

    // 🔍 RDS DB 조회 (서버에서만 실행)
    let user = await UserService.findUserBySocialAccount('google', String(profile.id));

    if (!user) {
      // 🔒 서버에서만 설정 가능
      return done(null, { socialProfile, isNewUser: true });
    }

    // 🔒 서버에서만 설정 가능
    return done(null, { user, socialProfile, isNewUser: false });
  } catch (error) {
    return done(error);
  }
}));
```

**핵심**:
- `profile` 객체는 Google이 직접 제공 (조작 불가)
- `UserService.findUserBySocialAccount()`는 서버에서만 실행
- `isNewUser`는 DB 조회 결과에 따라 서버에서만 설정

---

## 🚨 해커가 시도할 수 있는 공격과 방어

### 공격 1: 콜백 URL 직접 호출

**공격 시나리오**:
```bash
# 해커가 직접 콜백 URL 호출 시도
curl -X GET "http://localhost:3002/auth/google/callback"
```

**방어**:
```typescript
// src/routes/auth.routes.ts:18

router.get('/google/callback',
  authLimiter,
  passport.authenticate('google', { session: false }),  // ← 여기서 차단!
  (req, res) => {
    // ...
  }
);
```

**결과**:
```
passport.authenticate('google', { session: false })
  ↓
Google 인증 코드 검증
  ↓
인증 코드 없음 또는 유효하지 않음
  ↓
401 Unauthorized
```

**해커는 이 라인을 통과할 수 없습니다!**

---

### 공격 2: 가짜 인증 코드로 콜백 호출

**공격 시나리오**:
```bash
# 해커가 가짜 인증 코드로 시도
curl -X GET "http://localhost:3002/auth/google/callback?code=FAKE_CODE_12345"
```

**방어**:
```typescript
passport.authenticate('google', { session: false })
  ↓
Google Strategy 실행
  ↓
Google API에 인증 코드 검증 요청:
  POST https://oauth2.googleapis.com/token
  {
    code: "FAKE_CODE_12345",
    client_id: "...",
    client_secret: "...",
    redirect_uri: "..."
  }
  ↓
Google 응답: 400 Bad Request (invalid_grant)
  ↓
Passport 에러 처리
  ↓
401 Unauthorized
```

**해커는 Google 검증을 통과할 수 없습니다!**

---

### 공격 3: isNewUser 파라미터를 직접 전송

**공격 시나리오**:
```bash
# 해커가 isNewUser를 직접 전송 시도
curl -X POST "http://localhost:3002/auth/complete-social-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "010-1234-5678",
    "verificationCode": "123456",
    "isNewUser": false,  ← 조작 시도!
    "socialProfile": {
      "provider": "google",
      "providerId": "115618534042560606286",
      "email": "victim@gmail.com",
      "name": "Hacker"
    }
  }'
```

**방어**:
```typescript
// src/controllers/auth.controller.ts:62-126

static completeSocialLogin = async (req: Request, res: Response) => {
  const { phone, verificationCode, socialProfile } = req.body;

  // ⚠️ isNewUser는 req.body에서 받지 않음!
  // 해커가 보낸 isNewUser는 무시됨

  // 1. 전화번호 인증 확인
  let isPhoneVerified = await PhoneVerificationService.verifyPhoneCode(phone, verificationCode);

  if (!isPhoneVerified) {
    return ResponseUtil.error(res, '전화번호 인증에 실패했습니다.');
  }

  // 2. 🔍 서버에서 직접 DB 조회
  let user = await UserService.findUserByPhone(phone);

  if (user) {
    // 기존 사용자 - 소셜 계정만 연결
    await UserService.linkSocialAccount(user.id, socialProfile);
  } else {
    // 신규 사용자 - 새로 생성
    const newUser = await UserService.createUser(phone, ...);
    await UserService.linkSocialAccount(newUser.id, socialProfile);
    user = await UserService.findUserByPhone(phone);
  }

  // 3. 🔒 서버에서 직접 판별
  const response: LoginResponse = {
    user,
    tokens,
    isNewUser: !user  // ← 서버가 직접 설정!
  };

  return ResponseUtil.success(res, response);
};
```

**핵심**:
- `isNewUser`는 `req.body`에서 받지 않음
- 서버가 DB 조회 결과로 직접 판별
- 해커가 보낸 값은 무시됨

---

### 공격 4: socialProfile 조작 (providerId 위조)

**공격 시나리오**:
```bash
# 해커가 다른 사람의 Google ID로 시도
curl -X POST "http://localhost:3002/auth/complete-social-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "010-9999-9999",  ← 해커의 전화번호
    "verificationCode": "123456",
    "socialProfile": {
      "provider": "google",
      "providerId": "115618534042560606286",  ← 피해자의 Google ID!
      "email": "victim@gmail.com",
      "name": "Victim"
    }
  }'
```

**방어 1: 전화번호 인증 필수**

```typescript
// 1. 전화번호 인증 확인
let isPhoneVerified = await PhoneVerificationService.verifyPhoneCode(phone, verificationCode);

if (!isPhoneVerified) {
  return ResponseUtil.error(res, '전화번호 인증에 실패했습니다.');
}
```

**해커는 피해자의 전화번호 인증 코드를 알 수 없습니다!**

**방어 2: OAuth 콜백에서만 socialProfile 받음**

```typescript
// src/routes/auth.routes.ts:18-36

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const authResult = req.user as any;

    if (authResult.isNewUser) {
      // 🔒 Google이 제공한 socialProfile만 반환
      return ResponseUtil.success(res, {
        requirePhoneVerification: true,
        socialProfile: authResult.socialProfile,  // ← Google 검증된 정보만!
        tempToken: 'temp_' + Date.now()
      });
    }
  }
);
```

**정상 플로우**:
```
Google OAuth 인증
  ↓
Google이 제공한 providerId
  ↓
서버가 socialProfile 생성
  ↓
클라이언트로 전달
  ↓
클라이언트가 다시 서버로 전송 (complete-social-login)
```

**문제점**: 클라이언트에서 받은 socialProfile을 신뢰할 수 있는가?

**추가 방어 필요** (현재 구현에는 없음):

```typescript
// ⚠️ 보안 강화: tempToken 검증 추가

// 1. OAuth 콜백에서 임시 토큰 생성
const tempToken = jwt.sign(
  { socialProfile, timestamp: Date.now() },
  process.env.JWT_ACCESS_SECRET!,
  { expiresIn: '5m' }
);

// 2. complete-social-login에서 tempToken 검증
const decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET!);
const socialProfile = decoded.socialProfile;  // ← 검증된 정보만 사용
```

**현재 구현의 취약점**:
- `tempToken`이 실제 JWT가 아닌 `'temp_' + Date.now()` 단순 문자열
- socialProfile을 클라이언트에서 받아 그대로 신뢰

**권장 개선사항**: 아래 참조

---

## 🔒 보안 강화 권장사항

### 1. tempToken을 실제 JWT로 구현

**현재 코드**: `src/routes/auth.routes.ts:29`
```typescript
tempToken: 'temp_' + Date.now()  // ❌ 보안에 취약
```

**개선 코드**:
```typescript
import jwt from 'jsonwebtoken';

// OAuth 콜백에서
const tempToken = jwt.sign(
  {
    socialProfile: authResult.socialProfile,
    timestamp: Date.now()
  },
  process.env.JWT_ACCESS_SECRET!,
  { expiresIn: '5m' }  // 5분 유효
);

return ResponseUtil.success(res, {
  requirePhoneVerification: true,
  tempToken  // ← 검증 가능한 JWT
});
```

```typescript
// complete-social-login에서
const { phone, verificationCode, tempToken } = req.body;

// tempToken 검증
let socialProfile;
try {
  const decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET!) as any;
  socialProfile = decoded.socialProfile;  // ← OAuth로 검증된 정보만 사용
} catch (error) {
  return ResponseUtil.error(res, '유효하지 않은 인증 토큰입니다.', 401);
}

// 이후 로직 계속...
```

---

### 2. providerId 중복 체크 강화

**추가 검증**:
```typescript
// complete-social-login에서
const existingSocialAccount = await prisma.socialAccount.findUnique({
  where: {
    provider_providerId: {
      provider: socialProfile.provider,
      providerId: socialProfile.providerId
    }
  }
});

if (existingSocialAccount) {
  // 이미 다른 사용자에게 연결된 소셜 계정
  return ResponseUtil.error(res, '이미 다른 계정에 연결된 소셜 계정입니다.', 409);
}
```

---

### 3. Rate Limiting 강화

**현재**: `src/routes/auth.routes.ts:66`
```typescript
router.post('/complete-social-login', authLimiter, ...);
```

**강화**:
```typescript
// 전화번호별 Rate Limiting 추가
const phoneRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 3,  // 전화번호당 3회만 허용
  keyGenerator: (req) => req.body.phone,
  message: '너무 많은 시도입니다. 15분 후 다시 시도해주세요.'
});

router.post('/complete-social-login', authLimiter, phoneRateLimiter, ...);
```

---

## 📊 보안 레벨 비교

### 현재 구현

| 공격 유형 | 방어 수준 | 설명 |
|-----------|----------|------|
| 콜백 직접 호출 | ✅ 완벽 | Passport가 Google 인증 검증 |
| 가짜 인증 코드 | ✅ 완벽 | Google API가 검증 |
| isNewUser 조작 | ✅ 완벽 | 서버 내부 값, 조작 불가 |
| socialProfile 조작 | ⚠️ 중간 | tempToken이 단순 문자열 |
| providerId 중복 | ⚠️ 중간 | 추가 검증 필요 |

### 권장 개선 후

| 공격 유형 | 방어 수준 | 설명 |
|-----------|----------|------|
| 콜백 직접 호출 | ✅ 완벽 | Passport가 Google 인증 검증 |
| 가짜 인증 코드 | ✅ 완벽 | Google API가 검증 |
| isNewUser 조작 | ✅ 완벽 | 서버 내부 값, 조작 불가 |
| socialProfile 조작 | ✅ 완벽 | tempToken JWT 검증 |
| providerId 중복 | ✅ 완벽 | DB 중복 체크 |

---

## 🎯 결론

### isNewUser 조작 가능한가?

**아니요, 불가능합니다!** ✅

### 이유

1. **OAuth 인증 필수**: Google/Kakao 인증 없이는 콜백에 접근 불가
2. **서버 내부 값**: `isNewUser`는 Passport 미들웨어 내부에서만 설정
3. **DB 기반 판별**: RDS 조회 결과로 서버가 직접 판별
4. **클라이언트 입력 무시**: `req.body.isNewUser`는 받지도 사용하지도 않음

### 현재 구현의 보안 수준

- **핵심 보안**: ✅ 견고함
- **추가 개선 가능**: tempToken JWT 구현, providerId 중복 체크

### 권장사항

1. **tempToken을 실제 JWT로 구현** (높음)
2. **providerId 중복 체크 추가** (중간)
3. **전화번호별 Rate Limiting** (중간)

---

**해커는 `isNewUser`를 조작할 수 없습니다. OAuth 인증과 서버 측 DB 조회로 안전하게 보호되고 있습니다!** 🛡️
