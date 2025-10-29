# 회원가입 플로우 설명

## ❓ 회원가입 엔드포인트가 따로 있나요?

**아니요, 명시적인 "회원가입" 엔드포인트는 없습니다.**

이 시스템은 **소셜 로그인과 회원가입이 통합**되어 있습니다.

---

## 🔄 실제 회원가입 방식

### 방식: 소셜 로그인 = 자동 회원가입

```
사용자 → 소셜 로그인 클릭
        ↓
    신규 사용자?
    ├─ YES → 전화번호 인증 → 자동 회원가입 ✅
    └─ NO  → 즉시 로그인 ✅
```

---

## 📋 회원가입이 일어나는 곳

### 1. Google/Kakao 로그인 시도

**엔드포인트**:
- `GET /auth/google`
- `GET /auth/kakao`

**파일**: `src/routes/auth.routes.ts:11-15`

**동작**:
- 사용자가 "Google로 로그인" 버튼 클릭
- OAuth 인증 페이지로 리다이렉트

---

### 2. OAuth 콜백 처리

**엔드포인트**:
- `GET /auth/google/callback`
- `GET /auth/kakao/callback`

**파일**: `src/routes/auth.routes.ts:18-59`

**동작**:
```typescript
router.get('/google/callback',
  authLimiter,
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const authResult = req.user as any;

    if (authResult.isNewUser) {
      // 🆕 신규 사용자 - 전화번호 인증 필요
      return ResponseUtil.success(res, {
        requirePhoneVerification: true,
        socialProfile: authResult.socialProfile,
        tempToken: 'temp_' + Date.now()
      }, '전화번호 인증이 필요합니다.');
    } else {
      // ✅ 기존 사용자 - 바로 로그인
      return res.redirect(`${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`);
    }
  }
);
```

**핵심**:
- `authResult.isNewUser === true` → 신규 사용자 (회원가입 필요)
- `authResult.isNewUser === false` → 기존 사용자 (로그인)

---

### 3. 실제 회원가입이 일어나는 엔드포인트

**엔드포인트**:
```
POST /auth/complete-social-login
```

**파일**: `src/routes/auth.routes.ts:66`
```typescript
router.post('/complete-social-login', authLimiter, AuthController.completeSocialLogin);
```

**컨트롤러**: `src/controllers/auth.controller.ts:62-126`

**코드**:
```typescript
static completeSocialLogin = ErrorMiddleware.asyncHandler(
  async (req: Request, res: Response) => {
    const { phone, verificationCode, socialProfile } = req.body;

    // 전화번호 인증 확인
    let isPhoneVerified = await PhoneVerificationService.verifyPhoneCode(phone, verificationCode);

    if (!isPhoneVerified) {
      return ResponseUtil.error(res, '전화번호 인증에 실패했습니다.');
    }

    // 🔍 기존 사용자 확인
    let user = await UserService.findUserByPhone(phone);

    if (user) {
      // 기존 사용자에 소셜 계정 연결
      await UserService.linkSocialAccount(user.id, socialProfile);
    } else {
      // 🆕 새 사용자 생성 (회원가입!)
      const newUser = await UserService.createUser(
        phone,
        socialProfile.name,
        socialProfile.email,
        socialProfile.profileImage
      );
      await UserService.linkSocialAccount(newUser.id, socialProfile);

      user = await UserService.findUserByPhone(phone);
    }

    // JWT 토큰 발급
    const tokens = await JwtTokenService.generateTokens(user.id);

    return ResponseUtil.success(res, { user, tokens }, '로그인이 완료되었습니다.');
  }
);
```

**핵심 로직**:
```typescript
// 1. 전화번호로 기존 사용자 찾기
let user = await UserService.findUserByPhone(phone);

if (user) {
  // 기존 사용자 - 소셜 계정만 연결
  await UserService.linkSocialAccount(user.id, socialProfile);
} else {
  // 🆕 신규 사용자 - 회원가입!
  const newUser = await UserService.createUser(phone, name, email, profileImage);
  await UserService.linkSocialAccount(newUser.id, socialProfile);
}
```

---

## 🎯 회원가입 플로우 전체 정리

### 신규 사용자의 회원가입 과정

```
1. 프론트엔드: "Google로 로그인" 버튼 클릭
   GET /auth/google
   └─> src/routes/auth.routes.ts:11

2. Google OAuth 인증 페이지
   └─> 사용자 인증 및 동의

3. Google → 인증 서버 콜백
   GET /auth/google/callback
   └─> src/routes/auth.routes.ts:18
   └─> Passport가 Google에서 사용자 정보 가져옴

4. 인증 서버: 신규 사용자 확인
   └─> DB에서 providerId로 SocialAccount 검색
   └─> 없음 → isNewUser = true

5. 인증 서버 → 프론트엔드 (JSON 응답)
   {
     "requirePhoneVerification": true,
     "socialProfile": { ... }
   }

6. 프론트엔드: 전화번호 인증 시작
   POST /auth/send-verification
   └─> src/routes/auth.routes.ts:62

7. 서버 콘솔에서 인증 코드 확인
   [SMS] Would send to 010-1234-5678: 인증코드: 123456

8. 프론트엔드: 전화번호 인증
   POST /auth/verify-phone
   └─> src/routes/auth.routes.ts:63

9. 프론트엔드: 회원가입 완료 요청 ✅
   POST /auth/complete-social-login
   └─> src/routes/auth.routes.ts:66
   └─> src/controllers/auth.controller.ts:62

10. 서버: 회원가입 처리
    ├─> UserService.createUser() 호출
    │   └─> DB에 User 레코드 생성 🆕
    ├─> UserService.linkSocialAccount() 호출
    │   └─> DB에 SocialAccount 레코드 생성 🆕
    └─> JwtTokenService.generateTokens() 호출
        └─> Access Token & Refresh Token 발급 ✅

11. 프론트엔드: 토큰 저장 및 로그인 완료
```

---

## 🔍 UserService.createUser() - 실제 회원가입 코드

**파일**: `src/services/user.service.ts`

```typescript
export class UserService {
  /**
   * 새 사용자 생성 (회원가입!)
   */
  static async createUser(
    phone: string,
    name?: string,
    email?: string,
    profileImage?: string
  ) {
    const user = await prisma.user.create({
      data: {
        phone: PhoneUtil.normalizePhoneNumber(phone),
        name,
        email,
        profileImage,
        isActive: true
      }
    });

    return user;
  }

  /**
   * 소셜 계정 연결
   */
  static async linkSocialAccount(userId: string, socialProfile: any) {
    // 이미 연결된 계정인지 확인
    const existing = await prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: socialProfile.provider,
          providerId: socialProfile.providerId
        }
      }
    });

    if (existing) {
      return existing;
    }

    // 새 소셜 계정 연결
    const socialAccount = await prisma.socialAccount.create({
      data: {
        userId,
        provider: socialProfile.provider,
        providerId: socialProfile.providerId,
        email: socialProfile.email,
        name: socialProfile.name,
        profileImage: socialProfile.profileImage,
        accessToken: socialProfile.accessToken,
        refreshToken: socialProfile.refreshToken
      }
    });

    return socialAccount;
  }
}
```

---

## 📊 데이터베이스에 저장되는 데이터

### 회원가입 시 생성되는 레코드

#### 1. User 테이블
```sql
INSERT INTO users (id, phone, name, email, profileImage, isActive, createdAt, updatedAt)
VALUES (
  'cm3k9x2y30000pq9d8e9f6g7h',
  '010-1234-5678',
  NULL,
  NULL,
  NULL,
  1,
  '2025-10-16 05:15:32',
  '2025-10-16 05:15:32'
);
```

#### 2. SocialAccount 테이블
```sql
INSERT INTO social_accounts (id, userId, provider, providerId, email, name, profileImage)
VALUES (
  'cm3k9x2y30001pq9d8e9f6g7i',
  'cm3k9x2y30000pq9d8e9f6g7h',
  'google',
  '115618534042560606286',
  'ok4192ok@gmail.com',
  '옥용주',
  'https://lh3.googleusercontent.com/...'
);
```

#### 3. PhoneVerification 테이블
```sql
INSERT INTO phone_verifications (id, userId, phone, verificationCode, isVerified, expiresAt, createdAt)
VALUES (
  'cm3k9x2y30002pq9d8e9f6g7j',
  'cm3k9x2y30000pq9d8e9f6g7h',
  '010-1234-5678',
  '123456',
  1,
  '2025-10-16 05:20:32',
  '2025-10-16 05:15:32'
);
```

#### 4. JwtToken 테이블 (2개)
```sql
-- Access Token
INSERT INTO jwt_tokens (id, userId, tokenType, token, isRevoked, expiresAt, createdAt)
VALUES ('...', 'cm3k9x2y30000pq9d8e9f6g7h', 'access', 'eyJhbG...', 0, '2025-10-16 05:30:32', '2025-10-16 05:15:32');

-- Refresh Token
INSERT INTO jwt_tokens (id, userId, tokenType, token, isRevoked, expiresAt, createdAt)
VALUES ('...', 'cm3k9x2y30000pq9d8e9f6g7h', 'refresh', 'eyJhbG...', 0, '2025-10-23 05:15:32', '2025-10-16 05:15:32');
```

---

## ❓ 자주 묻는 질문

### Q1: 전통적인 이메일/비밀번호 회원가입은 없나요?

**A**: 없습니다. 이 시스템은 **소셜 로그인 전용**입니다.

이유:
- 비밀번호 관리 부담 제거
- 소셜 계정으로 신원 확인
- 전화번호로 추가 본인 인증

만약 이메일/비밀번호 회원가입을 추가하려면:
```typescript
// 새로운 엔드포인트 추가 필요
router.post('/signup', async (req, res) => {
  const { email, password, phone } = req.body;

  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);

  // 사용자 생성
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, phone }
  });

  // 토큰 발급
  const tokens = await JwtTokenService.generateTokens(user.id);

  return ResponseUtil.success(res, { user, tokens });
});
```

---

### Q2: 회원가입과 로그인을 어떻게 구분하나요?

**A**: 구분하지 않습니다. **통합 플로우**입니다.

```typescript
// Passport 전략에서 자동 판별
GoogleStrategy(
  async (accessToken, refreshToken, profile, done) => {
    // 1. DB에서 Google providerId로 검색
    let socialAccount = await prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'google',
          providerId: profile.id
        }
      }
    });

    if (socialAccount) {
      // ✅ 기존 사용자 - 로그인
      const user = await prisma.user.findUnique({
        where: { id: socialAccount.userId }
      });
      return done(null, { user, isNewUser: false });
    } else {
      // 🆕 신규 사용자 - 회원가입 필요
      return done(null, {
        isNewUser: true,
        socialProfile: {
          provider: 'google',
          providerId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          profileImage: profile.photos[0].value
        }
      });
    }
  }
);
```

---

### Q3: 회원가입 버튼과 로그인 버튼이 따로 필요한가요?

**A**: 아니요, **하나의 버튼**으로 충분합니다.

```jsx
// 프론트엔드 - 하나의 버튼으로 회원가입 & 로그인
export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3002/auth/google';
  };

  return (
    <div>
      <h1>시작하기</h1>
      {/* 신규/기존 사용자 모두 같은 버튼 */}
      <button onClick={handleGoogleLogin}>
        Google로 계속하기
      </button>
    </div>
  );
}
```

시스템이 자동으로 판별:
- 신규 사용자 → 전화번호 인증 → 회원가입
- 기존 사용자 → 즉시 로그인

---

### Q4: 회원가입 없이 바로 로그인할 수 있나요?

**A**: 아니요, 최소 1회는 전화번호 인증이 필요합니다.

```
첫 방문:
Google 로그인 → 전화번호 인증 → 회원가입 완료

두 번째 방문 이후:
Google 로그인 → 즉시 로그인 ✅ (전화번호 인증 불필요)
```

---

## 🎯 요약

### 회원가입 엔드포인트는?

**명시적인 엔드포인트**: ❌ 없음

**실제 회원가입이 일어나는 곳**:
```
POST /auth/complete-social-login
```

**하지만 사용자 입장에서는**:
```
"Google로 로그인" 버튼 = 회원가입 & 로그인 통합
```

### 회원가입 흐름

```
사용자 → "Google로 로그인" 클릭
       ↓
   Google 인증
       ↓
   신규 사용자?
       ↓ YES
   전화번호 인증
       ↓
   POST /auth/complete-social-login
       ↓
   UserService.createUser() ← 실제 회원가입 코드
       ↓
   DB에 User 생성 ✅
       ↓
   토큰 발급 & 로그인 완료
```

### 핵심

- **회원가입 = 소셜 로그인 + 전화번호 인증**
- **로그인 = 소셜 로그인만 (전화번호 인증 불필요)**
- **하나의 버튼으로 회원가입과 로그인 모두 처리**

---

이 시스템은 **소셜 로그인 기반 자동 회원가입** 방식입니다! 🚀
