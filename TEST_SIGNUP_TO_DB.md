# 회원가입 테스트 → DB 데이터 확인 가이드

직접 회원가입을 테스트하고 데이터베이스에 데이터가 정상적으로 저장되는지 확인하는 완벽 가이드입니다.

---

## 🎯 목표

1. Postman으로 회원가입 API 호출
2. 서버 콘솔에서 인증 코드 확인
3. 회원가입 완료
4. 데이터베이스에서 실제 저장된 데이터 확인

---

## 📋 사전 준비

### 1. 서버 실행

```bash
# 터미널 열기 (프로젝트 루트 디렉토리에서)
cd D:\pythonProject\dba-portal-auth

# 개발 서버 실행
npm run dev
```

**서버 실행 확인:**
```
Server is running on http://localhost:3002
✅ Connected to database
```

**중요:** 이 터미널 창은 계속 열어두세요! (인증 코드 확인용)

---

### 2. Postman 준비

- Postman 실행
- Environment 설정 (선택사항)

---

## 🚀 Step-by-Step 테스트

### Step 1: SMS 인증 코드 발송 📱

#### Postman 설정

**Method:** `POST`
**URL:** `http://localhost:3002/auth/send-verification`

**Headers:**
```
Content-Type: application/json
```

**Body (raw → JSON):**
```json
{
  "phone": "010-1234-5678"
}
```

#### Send 클릭!

**예상 응답:**
```json
{
  "success": true,
  "data": null,
  "message": "인증 코드가 발송되었습니다."
}
```

#### 서버 콘솔 확인! 🔍

터미널로 돌아가서 다음과 같은 메시지 확인:

```bash
[SMS] Would send to 010-1234-5678: 인증코드: 123456
```

**이 숫자(123456)를 복사하세요!** ← 이게 인증 코드입니다.

---

### Step 2: 전화번호 인증 ✅

#### Postman 설정

**Method:** `POST`
**URL:** `http://localhost:3002/auth/verify-phone`

**Headers:**
```
Content-Type: application/json
```

**Body (raw → JSON):**
```json
{
  "phone": "010-1234-5678",
  "verificationCode": "123456"
}
```

**중요:** `verificationCode`에 서버 콘솔에서 복사한 실제 코드를 입력하세요!

#### Send 클릭!

**예상 응답:**
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

### Step 3: 회원가입 완료 (소셜 로그인 연동) 🎉

#### Postman 설정

**Method:** `POST`
**URL:** `http://localhost:3002/auth/complete-social-login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw → JSON):**
```json
{
  "phone": "010-1234-5678",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "TEST_USER_001",
    "email": "testuser@kakao.com",
    "name": "테스트유저",
    "profileImage": "https://example.com/profile.jpg"
  }
}
```

**필드 설명:**
- `phone`: 인증한 전화번호 (동일하게)
- `verificationCode`: 서버 콘솔의 인증 코드 (동일하게)
- `socialProfile.provider`: `"kakao"` 또는 `"google"`
- `socialProfile.providerId`: 임의의 고유 ID (예: `"TEST_USER_001"`)
- `socialProfile.email`: 이메일 주소
- `socialProfile.name`: 사용자 이름
- `socialProfile.profileImage`: 프로필 이미지 URL (선택)

#### Send 클릭!

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm3k8x1y20000pq9d7e8f5g6h",
      "phone": "010-1234-5678",
      "name": null,
      "email": null,
      "profileImage": null,
      "isActive": true,
      "createdAt": "2025-10-16T04:30:15.234Z",
      "updatedAt": "2025-10-16T04:30:15.234Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "isNewUser": false
  },
  "message": "로그인이 완료되었습니다."
}
```

**✅ 회원가입 성공!**

---

## 🗄️ 데이터베이스 확인

이제 DB에 실제로 데이터가 들어갔는지 확인해봅시다!

### 방법 1: Prisma Studio 사용 (추천! 👍)

#### 새 터미널 창 열기

```bash
# 프로젝트 디렉토리로 이동
cd D:\pythonProject\dba-portal-auth

# Prisma Studio 실행
npx prisma studio
```

**자동으로 브라우저가 열립니다!**
주소: `http://localhost:5555`

#### Prisma Studio에서 확인

##### 1. **User** 테이블 클릭

다음과 같은 데이터가 보여야 합니다:

| id | phone | name | email | profileImage | isActive | createdAt | updatedAt |
|----|-------|------|-------|--------------|----------|-----------|-----------|
| cm3k8x1y2... | 010-1234-5678 | null | null | null | true | 2025-10-16... | 2025-10-16... |

**확인 포인트:**
- ✅ `phone`: 010-1234-5678
- ✅ `isActive`: true
- ✅ `createdAt`: 방금 시간

##### 2. **SocialAccount** 테이블 클릭

| id | userId | provider | providerId | email | name | profileImage |
|----|--------|----------|------------|-------|------|--------------|
| cm3k8x1... | cm3k8x1y2... | kakao | TEST_USER_001 | testuser@kakao.com | 테스트유저 | https://... |

**확인 포인트:**
- ✅ `provider`: kakao
- ✅ `providerId`: TEST_USER_001
- ✅ `email`: testuser@kakao.com
- ✅ `name`: 테스트유저
- ✅ `userId`가 User 테이블의 id와 일치

##### 3. **PhoneVerification** 테이블 클릭

| id | userId | phone | verificationCode | isVerified | expiresAt | createdAt |
|----|--------|-------|------------------|------------|-----------|-----------|
| cm3k8... | cm3k8x1y2... | 010-1234-5678 | 123456 | true | 2025-10-16... | 2025-10-16... |

**확인 포인트:**
- ✅ `phone`: 010-1234-5678
- ✅ `verificationCode`: 123456
- ✅ `isVerified`: true

##### 4. **JwtToken** 테이블 클릭

| id | userId | tokenType | token | isRevoked | expiresAt | createdAt |
|----|--------|-----------|-------|-----------|-----------|-----------|
| cm3k8... | cm3k8x1y2... | access | eyJhbG... | false | 2025-10-16... | 2025-10-16... |
| cm3k9... | cm3k8x1y2... | refresh | eyJhbG... | false | 2025-10-23... | 2025-10-16... |

**확인 포인트:**
- ✅ 2개의 토큰 생성 (access, refresh)
- ✅ `isRevoked`: false
- ✅ Access Token 만료 시간: 15분 후
- ✅ Refresh Token 만료 시간: 7일 후

---

### 방법 2: MySQL 클라이언트 사용

#### MySQL Workbench / DBeaver / TablePlus 등

**연결 정보:**
```
Host: (RDS 엔드포인트 또는 localhost)
Port: 3306
Username: (DATABASE_URL의 username)
Password: (DATABASE_URL의 password)
Database: dba_portal_auth
```

#### SQL 쿼리로 확인

##### 1. User 조회

```sql
SELECT * FROM users
WHERE phone = '010-1234-5678'
ORDER BY createdAt DESC
LIMIT 1;
```

**결과:**
```
+---------------------------+----------------+------+-------+--------------+----------+---------------------+---------------------+
| id                        | phone          | name | email | profileImage | isActive | createdAt           | updatedAt           |
+---------------------------+----------------+------+-------+--------------+----------+---------------------+---------------------+
| cm3k8x1y20000pq9d7e8f5g6h | 010-1234-5678  | NULL | NULL  | NULL         | 1        | 2025-10-16 04:30:15 | 2025-10-16 04:30:15 |
+---------------------------+----------------+------+-------+--------------+----------+---------------------+---------------------+
```

##### 2. SocialAccount 조회

```sql
SELECT sa.*
FROM social_accounts sa
JOIN users u ON sa.userId = u.id
WHERE u.phone = '010-1234-5678'
ORDER BY sa.createdAt DESC;
```

**결과:**
```
+---------------------------+---------------------------+----------+---------------+---------------------+--------------+------------------+
| id                        | userId                    | provider | providerId    | email               | name         | profileImage     |
+---------------------------+---------------------------+----------+---------------+---------------------+--------------+------------------+
| cm3k8x1y20001pq9d7e8f5g6i | cm3k8x1y20000pq9d7e8f5g6h | kakao    | TEST_USER_001 | testuser@kakao.com  | 테스트유저   | https://...      |
+---------------------------+---------------------------+----------+---------------+---------------------+--------------+------------------+
```

##### 3. PhoneVerification 조회

```sql
SELECT * FROM phone_verifications
WHERE phone = '010-1234-5678'
ORDER BY createdAt DESC
LIMIT 1;
```

##### 4. JwtToken 조회

```sql
SELECT id, userId, tokenType, isRevoked, expiresAt, createdAt
FROM jwt_tokens
WHERE userId = 'cm3k8x1y20000pq9d7e8f5g6h'
ORDER BY createdAt DESC;
```

##### 5. 전체 관계 확인 (JOIN)

```sql
SELECT
    u.id AS user_id,
    u.phone,
    u.isActive,
    sa.provider,
    sa.providerId,
    sa.email AS social_email,
    sa.name AS social_name,
    COUNT(DISTINCT jt.id) AS token_count
FROM users u
LEFT JOIN social_accounts sa ON u.id = sa.userId
LEFT JOIN jwt_tokens jt ON u.id = jt.userId AND jt.isRevoked = 0
WHERE u.phone = '010-1234-5678'
GROUP BY u.id, u.phone, u.isActive, sa.provider, sa.providerId, sa.email, sa.name;
```

**결과:**
```
+---------------------------+----------------+----------+----------+---------------+---------------------+--------------+-------------+
| user_id                   | phone          | isActive | provider | providerId    | social_email        | social_name  | token_count |
+---------------------------+----------------+----------+----------+---------------+---------------------+--------------+-------------+
| cm3k8x1y20000pq9d7e8f5g6h | 010-1234-5678  | 1        | kakao    | TEST_USER_001 | testuser@kakao.com  | 테스트유저   | 2           |
+---------------------------+----------------+----------+----------+---------------+---------------------+--------------+-------------+
```

---

### 방법 3: API로 확인

회원가입 후 받은 `accessToken`을 사용하여 내 정보 조회:

#### Postman 설정

**Method:** `GET`
**URL:** `http://localhost:3002/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**중요:** `Bearer` 뒤에 Step 3에서 받은 `accessToken` 붙여넣기

#### Send 클릭!

**응답:**
```json
{
  "success": true,
  "data": {
    "id": "cm3k8x1y20000pq9d7e8f5g6h",
    "phone": "010-1234-5678",
    "name": null,
    "email": null,
    "profileImage": null,
    "isActive": true,
    "createdAt": "2025-10-16T04:30:15.234Z",
    "updatedAt": "2025-10-16T04:30:15.234Z",
    "socialAccounts": [
      {
        "provider": "kakao",
        "email": "testuser@kakao.com",
        "name": "테스트유저",
        "profileImage": "https://example.com/profile.jpg"
      }
    ]
  },
  "message": "사용자 정보를 조회했습니다."
}
```

**✅ DB 데이터 확인 완료!**

---

## 🧪 추가 테스트 시나리오

### 시나리오 1: 다른 전화번호로 회원가입

```json
{
  "phone": "010-9999-8888",
  "verificationCode": "(서버 콘솔 확인)",
  "socialProfile": {
    "provider": "google",
    "providerId": "TEST_USER_002",
    "email": "testuser2@gmail.com",
    "name": "홍길동",
    "profileImage": null
  }
}
```

Prisma Studio에서 users 테이블에 새로운 행이 추가되는지 확인!

---

### 시나리오 2: 같은 전화번호에 다른 소셜 계정 연동

1. 이미 가입한 전화번호로 인증 (`010-1234-5678`)
2. 다른 provider로 회원가입 시도:

```json
{
  "phone": "010-1234-5678",
  "verificationCode": "(서버 콘솔 확인)",
  "socialProfile": {
    "provider": "google",
    "providerId": "TEST_USER_003",
    "email": "testuser@gmail.com",
    "name": "테스트유저",
    "profileImage": null
  }
}
```

**예상 결과:**
- users 테이블: 새로운 행이 생기지 않음 (기존 사용자)
- social_accounts 테이블: 새로운 행이 추가됨 (Google 계정 연동)

Prisma Studio에서 확인:
- **User**: 1개 (변화 없음)
- **SocialAccount**: 2개 (kakao, google)

---

## 📊 데이터 구조 이해하기

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│     User        │
│─────────────────│
│ id (PK)         │◄──┐
│ phone           │   │
│ name            │   │
│ email           │   │
│ profileImage    │   │
│ isActive        │   │
│ createdAt       │   │
│ updatedAt       │   │
└─────────────────┘   │
                      │
        ┌─────────────┴──────────────┬─────────────────┬─────────────────┐
        │                            │                 │                 │
┌───────▼──────────┐  ┌──────────────▼──────┐  ┌─────▼──────────┐  ┌──▼──────────────┐
│ SocialAccount    │  │ PhoneVerification   │  │ JwtToken       │  │ ...             │
│──────────────────│  │─────────────────────│  │────────────────│  │                 │
│ id (PK)          │  │ id (PK)             │  │ id (PK)        │  │                 │
│ userId (FK)      │  │ userId (FK)         │  │ userId (FK)    │  │                 │
│ provider         │  │ phone               │  │ tokenType      │  │                 │
│ providerId       │  │ verificationCode    │  │ token          │  │                 │
│ email            │  │ isVerified          │  │ isRevoked      │  │                 │
│ name             │  │ expiresAt           │  │ expiresAt      │  │                 │
│ profileImage     │  │ createdAt           │  │ createdAt      │  │                 │
└──────────────────┘  └─────────────────────┘  └────────────────┘  └─────────────────┘
```

### 데이터 관계

- **User** ↔ **SocialAccount**: 1:N (한 사용자가 여러 소셜 계정 연동 가능)
- **User** ↔ **PhoneVerification**: 1:N (한 사용자가 여러 번 인증 시도 가능)
- **User** ↔ **JwtToken**: 1:N (한 사용자가 여러 토큰 보유 가능)

---

## ✅ 체크리스트

회원가입 완료 후 확인할 것:

- [ ] **users** 테이블에 새 행 추가
  - [ ] phone 필드 정확
  - [ ] isActive = true
  - [ ] createdAt 시간 정확

- [ ] **social_accounts** 테이블에 새 행 추가
  - [ ] provider 정확 (kakao/google)
  - [ ] providerId 정확
  - [ ] email, name 정확
  - [ ] userId가 users.id와 일치

- [ ] **phone_verifications** 테이블에 인증 이력
  - [ ] phone 일치
  - [ ] isVerified = true
  - [ ] verificationCode 일치

- [ ] **jwt_tokens** 테이블에 토큰 2개
  - [ ] access token (만료: 15분)
  - [ ] refresh token (만료: 7일)
  - [ ] isRevoked = false
  - [ ] userId 일치

---

## 🎯 성공 기준

다음 조건을 모두 만족하면 성공입니다:

✅ Postman에서 회원가입 API 응답 성공 (200 OK)
✅ accessToken, refreshToken 발급
✅ Prisma Studio에서 4개 테이블 모두 데이터 확인
✅ userId가 모든 테이블에서 일관성 있게 연결
✅ GET /auth/me API로 사용자 정보 조회 성공

---

## 🚨 문제 해결

### 문제 1: "인증 코드가 일치하지 않습니다"

**원인:**
- 서버 콘솔의 코드와 다른 코드 입력
- 5분 이상 경과하여 코드 만료

**해결:**
1. 서버 콘솔에서 정확한 6자리 숫자 확인
2. 복사-붙여넣기로 정확히 입력
3. 만료된 경우 Step 1부터 다시 시작

---

### 문제 2: Prisma Studio에서 데이터가 안 보임

**원인:**
- 캐시 문제
- 다른 데이터베이스 연결

**해결:**
1. Prisma Studio 새로고침 (Ctrl+R)
2. `.env` 파일의 `DATABASE_URL` 확인
3. 서버 로그에서 "Connected to database" 확인

---

### 문제 3: "유효하지 않은 전화번호 형식입니다"

**원인:**
- 하이픈(-) 없이 입력
- 잘못된 형식

**해결:**
올바른 형식: `010-1234-5678` (하이픈 포함 필수!)

---

## 📸 스크린샷 가이드

### Prisma Studio 화면

```
┌─────────────────────────────────────────────────┐
│ Prisma Studio                                   │
├─────────────────────────────────────────────────┤
│ Models:                                         │
│   ▼ User                        [새로고침 🔄]    │
│   ▼ SocialAccount                               │
│   ▼ PhoneVerification                           │
│   ▼ JwtToken                                    │
│                                                 │
│ User 테이블:                                     │
│ ┌────────┬──────────────┬──────┬───────┬───────┐│
│ │ id     │ phone        │ name │ email │ ...   ││
│ ├────────┼──────────────┼──────┼───────┼───────┤│
│ │ cm3k.. │010-1234-5678 │ null │ null  │ ...   ││
│ └────────┴──────────────┴──────┴───────┴───────┘│
│                                   총 1개 레코드  │
└─────────────────────────────────────────────────┘
```

---

## 🎓 학습 포인트

이 테스트를 통해 배우는 것:

1. **API 플로우**: 인증 → 검증 → 회원가입 3단계 구조
2. **데이터베이스 관계**: User를 중심으로 한 1:N 관계
3. **JWT 토큰**: Access/Refresh Token 이중 구조
4. **전화번호 인증**: SMS 기반 본인 인증 프로세스
5. **소셜 로그인 연동**: 동일 전화번호로 여러 소셜 계정 연동 가능

---

## 📚 다음 단계

회원가입 테스트 완료 후:

1. **로그인 테스트**: 기존 사용자로 다시 로그인
2. **프로필 수정**: PUT /auth/profile 테스트
3. **토큰 갱신**: POST /auth/refresh 테스트
4. **로그아웃**: POST /auth/logout 테스트
5. **계정 비활성화**: DELETE /auth/account 테스트

---

Happy Testing! 🚀

이제 직접 테스트해보세요!
