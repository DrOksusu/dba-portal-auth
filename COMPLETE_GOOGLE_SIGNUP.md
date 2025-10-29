# Google 로그인 완료하기 - 옥용주님

Google OAuth 인증이 성공했습니다! 이제 전화번호 인증을 완료하여 회원가입을 마무리하세요.

---

## 📋 받은 Google 프로필 정보

```json
{
  "provider": "google",
  "providerId": "115618534042560606286",
  "email": "ok4192ok@gmail.com",
  "name": "옥용주",
  "profileImage": "https://lh3.googleusercontent.com/a/ACg8ocKreoqG5Mk4hg9WeSBvUPX8uGEiJ4ZBdCPErAslVlzxCQT--JLh=s96-c"
}
```

---

## 🚀 회원가입 완료 3단계

### Step 1: SMS 인증 코드 발송 📱

#### Postman 요청

```http
POST http://localhost:3002/auth/send-verification
Content-Type: application/json

{
  "phone": "010-1234-5678"
}
```

**본인의 실제 전화번호로 변경하세요!**

#### 서버 콘솔 확인

터미널 창에서 다음과 같은 메시지를 찾으세요:

```bash
[SMS] Would send to 010-1234-5678: 인증코드: 847293
```

**이 6자리 숫자를 복사하세요!** ← 이게 인증 코드입니다.

---

### Step 2: 전화번호 인증 ✅

#### Postman 요청

```http
POST http://localhost:3002/auth/verify-phone
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "847293"
}
```

**중요:**
- `phone`: Step 1과 동일한 전화번호
- `verificationCode`: 서버 콘솔의 실제 코드

#### 예상 응답

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

### Step 3: 회원가입 완료 🎉

#### Postman 요청

```http
POST http://localhost:3002/auth/complete-social-login
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "847293",
  "socialProfile": {
    "provider": "google",
    "providerId": "115618534042560606286",
    "email": "ok4192ok@gmail.com",
    "name": "옥용주",
    "profileImage": "https://lh3.googleusercontent.com/a/ACg8ocKreoqG5Mk4hg9WeSBvUPX8uGEiJ4ZBdCPErAslVlzxCQT--JLh=s96-c"
  }
}
```

**필드 설명:**
- `phone`: 인증한 전화번호
- `verificationCode`: 서버 콘솔의 인증 코드
- `socialProfile`: 위에서 받은 Google 프로필 정보 그대로 사용

#### 예상 응답

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm3k9x2y30000pq9d8e9f6g7h",
      "phone": "010-1234-5678",
      "name": null,
      "email": null,
      "profileImage": null,
      "isActive": true,
      "createdAt": "2025-10-16T05:15:32.456Z",
      "updatedAt": "2025-10-16T05:15:32.456Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTNrOXgyeTMwMDAwcHE5ZDhlOWY2ZzdoIiwiaWF0IjoxNzI5MDU3NTMyLCJleHAiOjE3MjkwNTg0MzJ9.abc123...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTNrOXgyeTMwMDAwcHE5ZDhlOWY2ZzdoIiwidG9rZW5UeXBlIjoicmVmcmVzaCIsImlhdCI6MTcyOTA1NzUzMiwiZXhwIjoxNzI5NjYyMzMyfQ.xyz789..."
    },
    "isNewUser": false
  },
  "message": "로그인이 완료되었습니다."
}
```

**✅ 회원가입 성공!**

**받은 토큰:**
- `accessToken`: 유효기간 15분
- `refreshToken`: 유효기간 7일

---

## 🗄️ 데이터베이스 확인

### Prisma Studio 실행

```bash
# 새 터미널 창
npx prisma studio
```

브라우저에서 `http://localhost:5555` 자동으로 열림

### 확인할 데이터

#### 1. User 테이블

| id | phone | isActive | createdAt |
|----|-------|----------|-----------|
| cm3k9x2y3... | 010-1234-5678 | ✅ true | 2025-10-16 05:15:32 |

#### 2. SocialAccount 테이블

| provider | providerId | email | name | profileImage |
|----------|------------|-------|------|--------------|
| google | 115618534042560606286 | ok4192ok@gmail.com | 옥용주 | https://lh3... |

#### 3. PhoneVerification 테이블

| phone | verificationCode | isVerified |
|-------|------------------|------------|
| 010-1234-5678 | 847293 | ✅ true |

#### 4. JwtToken 테이블

| tokenType | isRevoked | expiresAt |
|-----------|-----------|-----------|
| access | ❌ false | 15분 후 |
| refresh | ❌ false | 7일 후 |

---

## 🎯 전체 플로우 요약

```
1. 브라우저에서 "Google로 로그인" 클릭
   ↓
2. Google OAuth 인증 완료
   ↓
3. "전화번호 인증이 필요합니다" 응답 받음 ✅ (현재 단계)
   ↓
4. Postman으로 SMS 발송 (Step 1)
   ↓
5. 서버 콘솔에서 인증 코드 확인
   ↓
6. 전화번호 인증 (Step 2)
   ↓
7. 회원가입 완료 (Step 3)
   ↓
8. Access Token & Refresh Token 발급 ✅
   ↓
9. 데이터베이스에 사용자 정보 저장 ✅
```

---

## 📱 Step 4: 내 정보 조회 (선택)

회원가입 완료 후 발급받은 토큰으로 내 정보 조회:

```http
GET http://localhost:3002/auth/me
Authorization: Bearer {accessToken}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "id": "cm3k9x2y30000pq9d8e9f6g7h",
    "phone": "010-1234-5678",
    "name": null,
    "email": null,
    "profileImage": null,
    "isActive": true,
    "createdAt": "2025-10-16T05:15:32.456Z",
    "updatedAt": "2025-10-16T05:15:32.456Z",
    "socialAccounts": [
      {
        "provider": "google",
        "email": "ok4192ok@gmail.com",
        "name": "옥용주",
        "profileImage": "https://lh3.googleusercontent.com/a/ACg8ocKreoqG5Mk4hg9WeSBvUPX8uGEiJ4ZBdCPErAslVlzxCQT--JLh=s96-c"
      }
    ]
  },
  "message": "사용자 정보를 조회했습니다."
}
```

---

## 🔄 다음에 다시 로그인할 때

이미 회원가입이 완료되었으므로, 다음번에는:

1. 브라우저에서 "Google로 로그인" 클릭
2. Google 인증 완료
3. **즉시 로그인 완료!** (전화번호 인증 불필요)
4. Access Token & Refresh Token 자동 발급

---

## 💡 빠른 실행

### Postman Collection 사용

1. `quick-signup-test.json` 파일을 Postman에 Import
2. Step 1부터 순차적으로 실행
3. 서버 콘솔에서 인증 코드 확인
4. Step 2, 3 실행

---

## ✅ 체크리스트

- [ ] Step 1: SMS 발송 (`POST /auth/send-verification`)
- [ ] 서버 콘솔에서 인증 코드 복사
- [ ] Step 2: 전화번호 인증 (`POST /auth/verify-phone`)
- [ ] Step 3: 회원가입 완료 (`POST /auth/complete-social-login`)
- [ ] Access Token, Refresh Token 발급 확인
- [ ] Prisma Studio에서 DB 데이터 확인
- [ ] Step 4: 내 정보 조회 (`GET /auth/me`)

---

## 🚨 주의사항

### 전화번호 형식

**올바른 형식:**
```
010-1234-5678
```

**잘못된 형식:**
```
01012345678        ❌ (하이픈 없음)
010 1234 5678      ❌ (공백)
+82-10-1234-5678   ❌ (국가 코드)
```

### 인증 코드 유효 시간

- **5분** 동안만 유효
- 만료 시 Step 1부터 다시 시작

### socialProfile 데이터

- **정확히 위의 데이터를 그대로 사용**
- providerId 변경하지 말 것
- email, name, profileImage 그대로 유지

---

Happy Testing! 🎉

이제 Postman으로 3단계만 진행하면 회원가입 완료됩니다!
