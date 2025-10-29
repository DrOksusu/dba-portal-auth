# isNewUser 완벽 가이드

## 🎯 `isNewUser`란?

**정의**: OAuth 인증 후 해당 사용자가 **신규 사용자인지 기존 사용자인지 구분하는 플래그**

**타입**: `boolean`
- `true`: 신규 사용자 (회원가입 필요)
- `false`: 기존 사용자 (즉시 로그인)

---

## 📍 `isNewUser`가 설정되는 곳

### 위치: Passport 미들웨어

**파일**: `src/middleware/passport.middleware.ts`

### Google 전략 (GoogleStrategy)

```typescript
// src/middleware/passport.middleware.ts:8-37

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'http://localhost:3002/auth/google/callback'
}, async (accessToken, refreshToken, profile: GoogleProfile, done) => {
  try {
    const socialProfile: SocialProfile = {
      provider: 'google',
      providerId: String(profile.id),
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      profileImage: profile.photos?.[0]?.value
    };

    // 🔍 1. 기존 소셜 계정으로 사용자 찾기
    let user = await UserService.findUserBySocialAccount('google', String(profile.id));

    if (!user) {
      // 🆕 2. 신규 사용자 - 전화번호 인증 필요
      return done(null, {
        socialProfile,
        isNewUser: true    // ← 신규 사용자!
      });
    }

    // ✅ 3. 기존 사용자 - 소셜 계정 정보 업데이트
    await UserService.updateSocialAccount('google', String(profile.id), socialProfile);

    return done(null, {
      user,
      socialProfile,
      isNewUser: false   // ← 기존 사용자!
    });
  } catch (error) {
    return done(error);
  }
}));
```

### Kakao 전략 (KakaoStrategy)

```typescript
// src/middleware/passport.middleware.ts:40-91

passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET!,
  callbackURL: 'http://localhost:3002/auth/kakao/callback'
}, async (accessToken, refreshToken, profile: KakaoProfile, done) => {
  try {
    const socialProfile: SocialProfile = {
      provider: 'kakao',
      providerId: String(profile.id),
      email: profile.kakao_account?.email,
      name: profile.kakao_account?.profile?.nickname,
      profileImage: profile.kakao_account?.profile?.profile_image_url
    };

    // 카카오에서 전화번호 정보 가져오기
    const phone = profile.kakao_account?.phone_number;

    // 🔍 1. 기존 소셜 계정으로 사용자 찾기
    let user = await UserService.findUserBySocialAccount('kakao', String(profile.id));

    if (!user && phone) {
      // 🔍 2. 전화번호로 기존 사용자 찾기 (계정 통합)
      user = await UserService.findUserByPhone(phone);

      if (user) {
        // ✅ 기존 사용자에 카카오 계정 연결
        await UserService.linkSocialAccount(user.id, socialProfile);
        return done(null, {
          user,
          socialProfile,
          isNewUser: false,           // ← 기존 사용자!
          accountLinked: true
        });
      }
    }

    if (!user) {
      // 🆕 신규 사용자
      if (phone) {
        // 📱 카카오에서 전화번호를 받은 경우 바로 계정 생성
        user = await UserService.createUser(
          phone,
          socialProfile.name,
          socialProfile.email,
          socialProfile.profileImage
        );
        await UserService.linkSocialAccount(user.id, socialProfile);
        return done(null, {
          user,
          socialProfile,
          isNewUser: true,            // ← 신규 사용자!
          skipPhoneVerification: true // 전화번호 인증 생략
        });
      } else {
        // ❌ 전화번호가 없는 경우 전화번호 인증 필요
        return done(null, {
          socialProfile,
          isNewUser: true   // ← 신규 사용자!
        });
      }
    }

    // ✅ 기존 사용자 - 소셜 계정 정보 업데이트
    await UserService.updateSocialAccount('kakao', String(profile.id), socialProfile);

    return done(null, {
      user,
      socialProfile,
      isNewUser: false  // ← 기존 사용자!
    });
  } catch (error) {
    return done(error);
  }
}));
```

---

## 🔄 `isNewUser` 판별 로직

### Google 로그인

```
Google OAuth 인증 완료
    ↓
DB 조회: social_accounts 테이블에서
WHERE provider = 'google' AND providerId = {Google ID}
    ↓
    ├─ 레코드 있음 → isNewUser = false (기존 사용자)
    └─ 레코드 없음 → isNewUser = true (신규 사용자)
```

**코드**:
```typescript
// 기존 소셜 계정으로 사용자 찾기
let user = await UserService.findUserBySocialAccount('google', String(profile.id));

if (!user) {
  // 신규 사용자
  return done(null, { socialProfile, isNewUser: true });
}

// 기존 사용자
return done(null, { user, socialProfile, isNewUser: false });
```

### Kakao 로그인 (더 복잡)

```
Kakao OAuth 인증 완료
    ↓
DB 조회 1: social_accounts 테이블에서
WHERE provider = 'kakao' AND providerId = {Kakao ID}
    ↓
    ├─ 레코드 있음 → isNewUser = false (기존 사용자)
    └─ 레코드 없음 ↓
                   ↓
              카카오에서 전화번호 제공?
                   ↓
         ├─ YES → DB 조회 2: users 테이블에서
         │        WHERE phone = {Kakao 전화번호}
         │            ↓
         │            ├─ 레코드 있음 → 계정 연결, isNewUser = false
         │            └─ 레코드 없음 → 자동 회원가입, isNewUser = true
         │
         └─ NO  → isNewUser = true (전화번호 인증 필요)
```

**코드**:
```typescript
let user = await UserService.findUserBySocialAccount('kakao', String(profile.id));

if (!user && phone) {
  // 전화번호로 기존 사용자 찾기
  user = await UserService.findUserByPhone(phone);

  if (user) {
    // 기존 사용자에 카카오 계정 연결
    await UserService.linkSocialAccount(user.id, socialProfile);
    return done(null, { user, socialProfile, isNewUser: false, accountLinked: true });
  }
}

if (!user) {
  if (phone) {
    // 카카오에서 전화번호를 받은 경우 바로 계정 생성
    user = await UserService.createUser(phone, ...);
    await UserService.linkSocialAccount(user.id, socialProfile);
    return done(null, { user, socialProfile, isNewUser: true, skipPhoneVerification: true });
  } else {
    // 전화번호가 없는 경우 전화번호 인증 필요
    return done(null, { socialProfile, isNewUser: true });
  }
}

return done(null, { user, socialProfile, isNewUser: false });
```

---

## 📝 `isNewUser`가 사용되는 곳

### 1. auth.routes.ts - Google 콜백

**파일**: `src/routes/auth.routes.ts:18-36`

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
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
      );
    }
  }
);
```

**동작**:
- `isNewUser === true` → JSON 응답 (전화번호 인증 필요)
- `isNewUser === false` → 프론트엔드로 리다이렉트 (로그인 완료)

### 2. auth.routes.ts - Kakao 콜백

**파일**: `src/routes/auth.routes.ts:38-59`

```typescript
router.get('/kakao/callback',
  authLimiter,
  passport.authenticate('kakao', { session: false }),
  (req, res) => {
    const authResult = req.user as any;

    if (authResult.skipPhoneVerification) {
      // 📱 카카오에서 전화번호를 받아 바로 계정 생성된 경우
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
      );
    } else if (authResult.isNewUser) {
      // 🆕 신규 사용자 - 전화번호 인증 필요
      return ResponseUtil.success(res, {
        requirePhoneVerification: true,
        socialProfile: authResult.socialProfile,
        tempToken: 'temp_' + Date.now()
      }, '전화번호 인증이 필요합니다.');
    } else {
      // ✅ 기존 사용자 - 바로 로그인
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
      );
    }
  }
);
```

**동작**:
- `skipPhoneVerification === true` → 즉시 로그인 (카카오 전화번호 제공됨)
- `isNewUser === true` → JSON 응답 (전화번호 인증 필요)
- `isNewUser === false` → 프론트엔드로 리다이렉트 (로그인 완료)

### 3. auth.controller.ts - completeSocialLogin

**파일**: `src/controllers/auth.controller.ts:121`

```typescript
const response: LoginResponse = {
  user: {
    id: user.id,
    phone: user.phone,
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    profileImage: user.profileImage ?? undefined,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  },
  tokens,
  isNewUser: !user  // ← user가 없었으면 true (신규), 있었으면 false (기존)
};
```

**주의**: 이 부분의 `isNewUser`는 다른 의미입니다.
- `!user` → 회원가입 완료 API 호출 전에 user가 없었는지 여부
- 실제로는 항상 user가 생성된 후이므로 의미가 모호함

---

## 🎯 `isNewUser` 시나리오별 플로우

### 시나리오 1: 처음 Google 로그인하는 사용자

```typescript
// 1. Google OAuth 인증 완료
Google ID: "115618534042560606286"

// 2. Passport GoogleStrategy 실행
let user = await UserService.findUserBySocialAccount('google', '115618534042560606286');
// → user = null (DB에 레코드 없음)

// 3. isNewUser = true 설정
return done(null, {
  socialProfile: {
    provider: 'google',
    providerId: '115618534042560606286',
    email: 'user@gmail.com',
    name: '홍길동',
    profileImage: 'https://...'
  },
  isNewUser: true  // ← 신규 사용자!
});

// 4. auth.routes.ts - Google 콜백
if (authResult.isNewUser) {
  // JSON 응답: 전화번호 인증 필요
  return ResponseUtil.success(res, {
    requirePhoneVerification: true,
    socialProfile: authResult.socialProfile
  });
}

// 5. 프론트엔드: 전화번호 인증 진행
// 6. POST /auth/complete-social-login
// 7. 회원가입 완료!
```

### 시나리오 2: 이미 가입된 사용자가 Google 로그인

```typescript
// 1. Google OAuth 인증 완료
Google ID: "115618534042560606286"

// 2. Passport GoogleStrategy 실행
let user = await UserService.findUserBySocialAccount('google', '115618534042560606286');
// → user = { id: 'cm3k...', phone: '010-1234-5678', ... } (DB에 레코드 있음)

// 3. isNewUser = false 설정
return done(null, {
  user,
  socialProfile,
  isNewUser: false  // ← 기존 사용자!
});

// 4. auth.routes.ts - Google 콜백
if (authResult.isNewUser) {
  // 실행 안 됨
} else {
  // 프론트엔드로 리다이렉트 (로그인 완료)
  return res.redirect(
    `${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
  );
}

// 5. 프론트엔드: 토큰 저장, 로그인 완료!
```

### 시나리오 3: Kakao에서 전화번호를 받은 신규 사용자

```typescript
// 1. Kakao OAuth 인증 완료 (전화번호 포함)
Kakao ID: "1234567890"
Phone: "010-9876-5432"

// 2. Passport KakaoStrategy 실행
let user = await UserService.findUserBySocialAccount('kakao', '1234567890');
// → user = null

// 3. 전화번호로 기존 사용자 찾기
user = await UserService.findUserByPhone('010-9876-5432');
// → user = null

// 4. 카카오에서 전화번호를 받았으므로 즉시 회원가입
user = await UserService.createUser('010-9876-5432', ...);
await UserService.linkSocialAccount(user.id, socialProfile);

return done(null, {
  user,
  socialProfile,
  isNewUser: true,               // ← 신규 사용자!
  skipPhoneVerification: true    // ← 전화번호 인증 생략
});

// 5. auth.routes.ts - Kakao 콜백
if (authResult.skipPhoneVerification) {
  // 즉시 로그인 완료!
  return res.redirect(
    `${process.env.CLIENT_URL}/auth/success?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
  );
}

// 6. 프론트엔드: 토큰 저장, 로그인 완료!
```

---

## 📊 `isNewUser` 상태표

| 상황 | `isNewUser` | 추가 플래그 | 동작 |
|------|-------------|-------------|------|
| Google 신규 | `true` | - | 전화번호 인증 필요 |
| Google 기존 | `false` | - | 즉시 로그인 |
| Kakao 신규 (전화번호 있음) | `true` | `skipPhoneVerification: true` | 즉시 회원가입 & 로그인 |
| Kakao 신규 (전화번호 없음) | `true` | - | 전화번호 인증 필요 |
| Kakao 기존 | `false` | - | 즉시 로그인 |
| Kakao 계정 통합 | `false` | `accountLinked: true` | 즉시 로그인 |

---

## 🔍 디버깅 팁

### 1. isNewUser 값 확인

```typescript
// src/routes/auth.routes.ts

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const authResult = req.user as any;

    // 디버깅용 로그
    console.log('🔍 isNewUser:', authResult.isNewUser);
    console.log('🔍 user:', authResult.user);
    console.log('🔍 socialProfile:', authResult.socialProfile);

    if (authResult.isNewUser) {
      // ...
    }
  }
);
```

### 2. DB에서 직접 확인

```sql
-- Google providerId로 검색
SELECT * FROM social_accounts
WHERE provider = 'google' AND providerId = '115618534042560606286';

-- 결과가 없으면 → isNewUser = true
-- 결과가 있으면 → isNewUser = false
```

### 3. Passport 전략에서 로그

```typescript
// src/middleware/passport.middleware.ts

passport.use(new GoogleStrategy({...}, async (accessToken, refreshToken, profile, done) => {
  let user = await UserService.findUserBySocialAccount('google', String(profile.id));

  console.log('🔍 Found user:', user);

  if (!user) {
    console.log('🆕 New user detected!');
    return done(null, { socialProfile, isNewUser: true });
  }

  console.log('✅ Existing user detected!');
  return done(null, { user, socialProfile, isNewUser: false });
}));
```

---

## 🎯 핵심 요약

### `isNewUser`란?

**OAuth 인증 후 신규 사용자인지 기존 사용자인지 구분하는 플래그**

### 설정되는 곳

**Passport 미들웨어** (`src/middleware/passport.middleware.ts`)
- Google: 27번, 33번 라인
- Kakao: 67번, 77번, 80번, 87번 라인

### 판별 기준

```typescript
let user = await UserService.findUserBySocialAccount(provider, providerId);

if (!user) {
  isNewUser = true;  // 신규 사용자
} else {
  isNewUser = false; // 기존 사용자
}
```

### 사용되는 곳

**auth.routes.ts** (`src/routes/auth.routes.ts`)
- Google 콜백: 24번 라인
- Kakao 콜백: 47번 라인

### 동작

```typescript
if (authResult.isNewUser) {
  // 신규 → JSON 응답 (전화번호 인증 필요)
} else {
  // 기존 → 프론트엔드로 리다이렉트 (즉시 로그인)
}
```

---

`isNewUser`는 소셜 로그인 플로우의 핵심 플래그로, 신규/기존 사용자를 자동으로 구분하여 적절한 플로우로 안내합니다! 🎯
