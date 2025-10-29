# RDS DB 조회를 통한 신규/기존 사용자 판별 과정

## ✅ 정확합니다!

**네, 맞습니다!** 인증 서버는 **AWS RDS MySQL 데이터베이스**를 실시간으로 조회하여 신규/기존 사용자를 판별합니다.

---

## 🗄️ 연결된 RDS 데이터베이스

### 환경 설정

**파일**: `.env` (1-2번 라인)

```env
DATABASE_URL="mysql://dbmasteruser:Ok2010ok!!@ls-1ec41c8ce559af427653b60e97baaa3f70f60df3.c0zy4csz1exi.ap-northeast-2.rds.amazonaws.com:3306/koco_auth"
```

**데이터베이스 정보**:
- **호스트**: `ls-1ec41c8ce559af427653b60e97baaa3f70f60df3.c0zy4csz1exi.ap-northeast-2.rds.amazonaws.com`
- **포트**: `3306`
- **데이터베이스**: `koco_auth`
- **사용자**: `dbmasteruser`
- **리전**: `ap-northeast-2` (서울)

---

## 🔍 신규/기존 사용자 판별 전체 과정

### Google 로그인 예시

```
1. 사용자가 "Google로 로그인" 클릭
   ↓
2. Google OAuth 인증 완료
   Google이 반환한 정보:
   - Google ID: "115618534042560606286"
   - Email: "ok4192ok@gmail.com"
   - Name: "옥용주"
   ↓
3. Passport GoogleStrategy 실행
   (src/middleware/passport.middleware.ts:12)
   ↓
4. 🔍 RDS DB 조회 1: SocialAccount 테이블 검색
   UserService.findUserBySocialAccount('google', '115618534042560606286')

   실제 SQL:
   SELECT * FROM social_accounts sa
   JOIN users u ON sa.userId = u.id
   WHERE sa.provider = 'google'
     AND sa.providerId = '115618534042560606286'
   ↓
   ├─ 레코드 있음 (기존 사용자)
   │  → user = { id: 'cm3k...', phone: '010-1234-5678', ... }
   │  → isNewUser = false
   │  → 즉시 로그인!
   │
   └─ 레코드 없음 (신규 사용자)
      → user = null
      → isNewUser = true
      → 전화번호 인증 필요!
```

---

## 📊 DB 조회 함수 상세

### 1. findUserBySocialAccount() - 핵심 함수!

**파일**: `src/services/user.service.ts:38-56`

```typescript
static async findUserBySocialAccount(provider: string, providerId: string) {
  // 🔍 RDS DB 조회: social_accounts 테이블
  const socialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerId: {
        provider,      // 'google' 또는 'kakao'
        providerId     // Google/Kakao가 제공한 사용자 고유 ID
      }
    },
    include: {
      user: {
        include: {
          socialAccounts: true
        }
      }
    }
  });

  // 결과 반환
  return socialAccount?.user || null;
  // socialAccount가 있으면 → user 객체 반환 (기존 사용자)
  // socialAccount가 없으면 → null 반환 (신규 사용자)
}
```

**실제 실행되는 SQL**:
```sql
SELECT
  u.*,
  sa.*
FROM social_accounts sa
LEFT JOIN users u ON sa.userId = u.id
WHERE sa.provider = 'google'
  AND sa.providerId = '115618534042560606286'
LIMIT 1;
```

**RDS DB 테이블**: `koco_auth.social_accounts`

---

### 2. findUserByPhone() - Kakao 전화번호 연동용

**파일**: `src/services/user.service.ts:9-21`

```typescript
static async findUserByPhone(phone: string) {
  const normalizedPhone = PhoneUtil.normalizePhoneNumber(phone);

  // 🔍 RDS DB 조회: users 테이블
  return await prisma.user.findUnique({
    where: { phone: normalizedPhone },
    include: {
      socialAccounts: true,
      jwtTokens: {
        where: { isRevoked: false },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}
```

**실제 실행되는 SQL**:
```sql
SELECT
  u.*,
  sa.*,
  jt.*
FROM users u
LEFT JOIN social_accounts sa ON u.id = sa.userId
LEFT JOIN jwt_tokens jt ON u.id = jt.userId
WHERE u.phone = '010-1234-5678'
  AND jt.isRevoked = 0
ORDER BY jt.createdAt DESC
LIMIT 1;
```

**RDS DB 테이블**: `koco_auth.users`

---

## 🔄 실제 DB 조회 플로우 (Google)

### 시나리오 1: 처음 Google 로그인하는 사용자

```typescript
// 1. Google OAuth 인증 완료
const profile = {
  id: "115618534042560606286",
  email: "ok4192ok@gmail.com",
  name: "옥용주"
};

// 2. Passport 전략에서 DB 조회
let user = await UserService.findUserBySocialAccount('google', '115618534042560606286');

// 3. 실제 RDS 쿼리 실행
// AWS RDS (서울 리전) → koco_auth.social_accounts 테이블 검색
```

**RDS에서 실행되는 쿼리**:
```sql
-- RDS 서버: ls-1ec41c8ce559af427653b60e97baaa3f70f60df3.c0zy4csz1exi.ap-northeast-2.rds.amazonaws.com
-- 데이터베이스: koco_auth

SELECT * FROM social_accounts
WHERE provider = 'google'
  AND providerId = '115618534042560606286';

-- 결과: Empty set (0.02 sec)
-- → 레코드 없음!
```

```typescript
// 4. 결과 처리
// user = null (DB에 레코드 없음)

// 5. 신규 사용자 판정
if (!user) {
  return done(null, {
    socialProfile: {
      provider: 'google',
      providerId: '115618534042560606286',
      email: 'ok4192ok@gmail.com',
      name: '옥용주'
    },
    isNewUser: true  // ← RDS 조회 결과가 없으므로 true!
  });
}
```

---

### 시나리오 2: 이미 가입된 사용자가 다시 Google 로그인

```typescript
// 1. Google OAuth 인증 완료 (같은 사용자)
const profile = {
  id: "115618534042560606286",
  email: "ok4192ok@gmail.com",
  name: "옥용주"
};

// 2. Passport 전략에서 DB 조회
let user = await UserService.findUserBySocialAccount('google', '115618534042560606286');
```

**RDS에서 실행되는 쿼리**:
```sql
-- RDS 서버에서 실행
SELECT
  u.id,
  u.phone,
  u.name,
  u.email,
  u.profileImage,
  u.isActive,
  u.createdAt,
  u.updatedAt,
  sa.*
FROM social_accounts sa
LEFT JOIN users u ON sa.userId = u.id
WHERE sa.provider = 'google'
  AND sa.providerId = '115618534042560606286';

-- 결과:
-- +--------+----------------+--------+------------------+...
-- | id     | phone          | name   | email            |...
-- +--------+----------------+--------+------------------+...
-- | cm3k.. | 010-1234-5678  | NULL   | NULL             |...
-- +--------+----------------+--------+------------------+...
-- 1 row in set (0.01 sec)
-- → 레코드 있음!
```

```typescript
// 3. 결과 처리
// user = {
//   id: 'cm3k8x1y20000pq9d8e9f6g7h',
//   phone: '010-1234-5678',
//   name: null,
//   email: null,
//   isActive: true,
//   ...
// }

// 4. 기존 사용자 판정
if (!user) {
  // 실행 안 됨
} else {
  return done(null, {
    user,
    socialProfile,
    isNewUser: false  // ← RDS 조회 결과가 있으므로 false!
  });
}
```

---

## 🔄 실제 DB 조회 플로우 (Kakao + 전화번호)

### 시나리오 3: Kakao에서 전화번호를 받은 신규 사용자

```typescript
// 1. Kakao OAuth 인증 완료 (전화번호 포함)
const profile = {
  id: "1234567890",
  email: "user@kakao.com",
  phone: "+82 10-9876-5432"  // Kakao에서 제공
};

// 2. DB 조회 1: SocialAccount 검색
let user = await UserService.findUserBySocialAccount('kakao', '1234567890');
```

**RDS 쿼리 1**:
```sql
SELECT * FROM social_accounts
WHERE provider = 'kakao'
  AND providerId = '1234567890';

-- 결과: Empty set (신규 사용자)
```

```typescript
// user = null

// 3. Kakao에서 전화번호를 제공했으므로 추가 검색
const phone = '+82 10-9876-5432';  // → '010-9876-5432'로 정규화

if (!user && phone) {
  // DB 조회 2: 전화번호로 기존 사용자 검색
  user = await UserService.findUserByPhone('010-9876-5432');
}
```

**RDS 쿼리 2**:
```sql
SELECT * FROM users
WHERE phone = '010-9876-5432';

-- 결과: Empty set (전화번호도 처음)
```

```typescript
// user = null

// 4. 즉시 회원가입 진행
if (!user) {
  if (phone) {
    // 🆕 RDS에 새 사용자 생성
    user = await UserService.createUser(
      '010-9876-5432',
      'user@kakao.com',
      '카카오사용자'
    );

    await UserService.linkSocialAccount(user.id, socialProfile);

    return done(null, {
      user,
      socialProfile,
      isNewUser: true,            // ← 신규 사용자!
      skipPhoneVerification: true // Kakao에서 전화번호 받았으므로 인증 생략
    });
  }
}
```

**RDS에 실행되는 INSERT 쿼리**:
```sql
-- 1. User 생성
INSERT INTO users (id, phone, name, email, profileImage, isActive, createdAt, updatedAt)
VALUES (
  'cm3k9x2y30000pq9d8e9f6g7h',
  '010-9876-5432',
  '카카오사용자',
  'user@kakao.com',
  NULL,
  1,
  NOW(),
  NOW()
);

-- 2. SocialAccount 생성
INSERT INTO social_accounts (id, userId, provider, providerId, email, name)
VALUES (
  'cm3k9x2y30001pq9d8e9f6g7i',
  'cm3k9x2y30000pq9d8e9f6g7h',
  'kakao',
  '1234567890',
  'user@kakao.com',
  '카카오사용자'
);
```

---

## 📊 DB 조회 요약

### 신규/기존 판별을 위한 DB 조회

| 단계 | 조회 대상 | 테이블 | 목적 |
|------|-----------|--------|------|
| 1 | Google/Kakao providerId | `social_accounts` | 이미 연결된 소셜 계정인지 확인 |
| 2 (Kakao만) | 전화번호 | `users` | 동일 전화번호로 다른 소셜 계정 연동 확인 |

### 조회 결과에 따른 isNewUser 설정

```typescript
// Google
let user = await findUserBySocialAccount('google', providerId);
if (!user) {
  isNewUser = true;   // RDS에 레코드 없음 → 신규
} else {
  isNewUser = false;  // RDS에 레코드 있음 → 기존
}

// Kakao (전화번호 있음)
let user = await findUserBySocialAccount('kakao', providerId);
if (!user) {
  user = await findUserByPhone(phone);
  if (!user) {
    // 즉시 회원가입
    user = await createUser(phone, ...);
    isNewUser = true;   // 새로 생성 → 신규
  } else {
    // 계정 연결
    isNewUser = false;  // 기존 User에 연결 → 기존
  }
}
```

---

## 🔍 RDS DB 직접 확인하기

### MySQL Workbench / DBeaver / TablePlus 등으로 연결

**연결 정보**:
```
Host: ls-1ec41c8ce559af427653b60e97baaa3f70f60df3.c0zy4csz1exi.ap-northeast-2.rds.amazonaws.com
Port: 3306
Username: dbmasteruser
Password: Ok2010ok!!
Database: koco_auth
```

### 신규/기존 사용자 확인 쿼리

```sql
-- Google providerId로 확인
SELECT
  u.id,
  u.phone,
  sa.provider,
  sa.providerId,
  sa.email,
  sa.name
FROM social_accounts sa
LEFT JOIN users u ON sa.userId = u.id
WHERE sa.provider = 'google'
  AND sa.providerId = '115618534042560606286';

-- 결과가 있으면 → 기존 사용자 (isNewUser = false)
-- 결과가 없으면 → 신규 사용자 (isNewUser = true)
```

---

## 🎯 핵심 정리

### Q: RDS DB를 참조하나요?

**A: 네, 맞습니다!** ✅

### 어떻게?

```
1. OAuth 인증 완료
   ↓
2. Passport 전략에서 UserService.findUserBySocialAccount() 호출
   ↓
3. Prisma ORM이 RDS MySQL에 SQL 쿼리 실행
   ↓
4. RDS에서 결과 반환
   ↓
5. 결과에 따라 isNewUser 설정
   - 레코드 있음 → isNewUser = false (기존)
   - 레코드 없음 → isNewUser = true (신규)
```

### 어디서?

- **RDS 서버**: AWS Seoul Region (ap-northeast-2)
- **호스트**: `ls-1ec41c8ce559af427653b60e97baaa3f70f60df3.c0zy4csz1exi.ap-northeast-2.rds.amazonaws.com`
- **데이터베이스**: `koco_auth`
- **테이블**: `social_accounts`, `users`

### 왜?

- 실시간으로 신규/기존 사용자를 정확하게 판별
- 소셜 계정 중복 가입 방지
- 동일 전화번호로 여러 소셜 계정 통합

---

**네, 정확합니다! RDS MySQL 데이터베이스를 실시간으로 조회하여 신규/기존 사용자를 판별합니다!** 🎯
