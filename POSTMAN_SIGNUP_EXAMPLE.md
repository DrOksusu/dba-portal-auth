# Postman 회원가입 요청 예시 가이드

실제로 Postman에서 회원가입 전체 플로우를 테스트하는 **단계별 예시**입니다.

---

## 🎯 회원가입 전체 플로우

```
1. SMS 인증 코드 발송
   ↓
2. 서버 콘솔에서 인증 코드 확인
   ↓
3. 전화번호 인증 코드 검증
   ↓
4. 소셜 로그인 완료 (회원가입)
   ↓
5. Access Token & Refresh Token 발급
```

---

## 📝 Step 1: SMS 인증 코드 발송

### Request

**Method:** `POST`
**URL:** `http://localhost:3002/auth/send-verification`
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "phone": "010-9876-5432"
}
```

### Postman 설정

1. **New Request** 클릭
2. **Method**: `POST` 선택
3. **URL**: `http://localhost:3002/auth/send-verification` 입력
4. **Headers** 탭:
   - Key: `Content-Type`
   - Value: `application/json`
5. **Body** 탭:
   - `raw` 선택
   - 드롭다운에서 `JSON` 선택
   - 위 JSON 입력

### Response 예시

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "인증 코드가 발송되었습니다."
}
```

### 서버 콘솔 확인

```bash
[SMS] Would send to 010-9876-5432: 인증코드: 847362
```

**중요:**
- 개발 환경에서는 실제 SMS가 발송되지 않습니다
- 서버 콘솔에 출력된 인증 코드(`847362`)를 복사하세요
- 이 코드는 5분간 유효합니다

---

## 📝 Step 2: 전화번호 인증 코드 검증

### Request

**Method:** `POST`
**URL:** `http://localhost:3002/auth/verify-phone`
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "phone": "010-9876-5432",
  "verificationCode": "847362"
}
```

### Postman 설정

1. **New Request** 클릭
2. **Method**: `POST` 선택
3. **URL**: `http://localhost:3002/auth/verify-phone` 입력
4. **Headers** 탭:
   - Key: `Content-Type`
   - Value: `application/json`
5. **Body** 탭:
   - `raw` 선택
   - `JSON` 선택
   - 위 JSON 입력 (서버 콘솔의 실제 코드 사용)

### Response 예시

**Status:** `200 OK`

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

## 📝 Step 3: 소셜 로그인 완료 (회원가입)

### Request

**Method:** `POST`
**URL:** `http://localhost:3002/auth/complete-social-login`
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "phone": "010-9876-5432",
  "verificationCode": "847362",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "9988776655",
    "email": "newuser@kakao.com",
    "name": "김철수",
    "profileImage": "https://k.kakaocdn.net/dn/profile/sample.jpg"
  }
}
```

### Postman 설정

1. **New Request** 클릭
2. **Method**: `POST` 선택
3. **URL**: `http://localhost:3002/auth/complete-social-login` 입력
4. **Headers** 탭:
   - Key: `Content-Type`
   - Value: `application/json`
5. **Body** 탭:
   - `raw` 선택
   - `JSON` 선택
   - 위 JSON 입력

### socialProfile 필드 설명

| 필드 | 설명 | 예시 |
|------|------|------|
| `provider` | 소셜 로그인 제공자 | `"kakao"` 또는 `"google"` |
| `providerId` | 제공자의 사용자 고유 ID | `"9988776655"` |
| `email` | 이메일 주소 | `"user@kakao.com"` |
| `name` | 사용자 이름 | `"김철수"` |
| `profileImage` | 프로필 이미지 URL | `"https://..."` |

### Response 예시

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm3a5f8g90000v8pq4e5d2h1k",
      "phone": "010-9876-5432",
      "name": null,
      "email": null,
      "profileImage": null,
      "isActive": true,
      "createdAt": "2025-10-16T03:24:15.789Z",
      "updatedAt": "2025-10-16T03:24:15.789Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTNhNWY4ZzkwMDAwdjhwcTRlNWQyaDFrIiwiaWF0IjoxNzI5MDQ2NjU1LCJleHAiOjE3MjkwNDc1NTV9.xK4p9Jm2_L8vNq1RtY3WzE5aO6bCdF7gH8iJ9kL0mN1",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTNhNWY4ZzkwMDAwdjhwcTRlNWQyaDFrIiwidG9rZW5UeXBlIjoicmVmcmVzaCIsImlhdCI6MTcyOTA0NjY1NSwiZXhwIjoxNzI5NjUxNDU1fQ.pQ2rS3tU4vW5xY6zA7bC8dE9fG0hI1jK2lM3nO4pQ5"
    },
    "isNewUser": false
  },
  "message": "로그인이 완료되었습니다."
}
```

### 토큰 저장 (중요!)

응답에서 받은 토큰을 저장하세요:

**Postman Environment에 저장:**
1. **Environment** 선택
2. `accessToken` 변수에 응답의 `data.tokens.accessToken` 값 복사
3. `refreshToken` 변수에 응답의 `data.tokens.refreshToken` 값 복사

**또는 Tests 스크립트 사용 (자동 저장):**

Postman의 **Tests** 탭에 추가:

```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data.tokens) {
        pm.environment.set("accessToken", response.data.tokens.accessToken);
        pm.environment.set("refreshToken", response.data.tokens.refreshToken);
        pm.environment.set("userId", response.data.user.id);
        console.log("✅ 회원가입 완료! 토큰이 저장되었습니다.");
    }
}
```

---

## 🔐 Step 4: 발급받은 토큰으로 인증된 API 호출

### Request: 내 프로필 조회

**Method:** `GET`
**URL:** `http://localhost:3002/auth/me`
**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Postman 설정

1. **New Request** 클릭
2. **Method**: `GET` 선택
3. **URL**: `http://localhost:3002/auth/me` 입력
4. **Authorization** 탭:
   - Type: `Bearer Token` 선택
   - Token: `{{accessToken}}` 입력 (Environment 변수 사용)
5. **Headers** 탭:
   - Key: `Content-Type`
   - Value: `application/json`

### Response 예시

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "cm3a5f8g90000v8pq4e5d2h1k",
    "phone": "010-9876-5432",
    "name": null,
    "email": null,
    "profileImage": null,
    "isActive": true,
    "createdAt": "2025-10-16T03:24:15.789Z",
    "updatedAt": "2025-10-16T03:24:15.789Z",
    "socialAccounts": [
      {
        "provider": "kakao",
        "email": "newuser@kakao.com",
        "name": "김철수",
        "profileImage": "https://k.kakaocdn.net/dn/profile/sample.jpg"
      }
    ]
  },
  "message": "사용자 정보를 조회했습니다."
}
```

---

## 🎨 다양한 회원가입 시나리오

### 시나리오 1: 구글 계정으로 회원가입

```json
{
  "phone": "010-1111-2222",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "google",
    "providerId": "112233445566778899",
    "email": "user@gmail.com",
    "name": "홍길동",
    "profileImage": "https://lh3.googleusercontent.com/a/sample"
  }
}
```

### 시나리오 2: 카카오 계정으로 회원가입

```json
{
  "phone": "010-3333-4444",
  "verificationCode": "654321",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "1234567890",
    "email": "user@kakao.com",
    "name": "이영희",
    "profileImage": "https://k.kakaocdn.net/dn/profile/image.jpg"
  }
}
```

### 시나리오 3: 이메일 없이 회원가입

```json
{
  "phone": "010-5555-6666",
  "verificationCode": "789012",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "9876543210",
    "email": null,
    "name": "박민수",
    "profileImage": null
  }
}
```

---

## 🚨 에러 케이스 테스트

### 에러 1: 전화번호 형식 오류

**Request:**
```json
{
  "phone": "01012345678"
}
```

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "유효하지 않은 전화번호 형식입니다."
}
```

**올바른 형식:** `010-1234-5678` (하이픈 포함)

---

### 에러 2: 잘못된 인증 코드

**Request:**
```json
{
  "phone": "010-9876-5432",
  "verificationCode": "000000"
}
```

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "유효하지 않은 인증 코드입니다."
}
```

---

### 에러 3: 만료된 인증 코드

인증 코드 발송 후 5분 경과 시:

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "인증 코드가 만료되었습니다."
}
```

**해결:** SMS 인증 코드를 다시 발송하세요.

---

### 에러 4: 필수 필드 누락

**Request:**
```json
{
  "phone": "010-9876-5432"
  // verificationCode 누락
}
```

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "전화번호와 인증 코드를 모두 입력해주세요."
}
```

---

### 에러 5: Rate Limit 초과

30초 내에 SMS를 2번 이상 요청 시:

**Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "message": "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
}
```

---

## 📊 완전한 Postman Collection 예시

### Collection 구조

```
신규 회원가입 플로우
├── 1. SMS 인증 코드 발송
├── 2. 전화번호 인증
├── 3. 회원가입 완료 (Kakao)
├── 4. 내 프로필 조회
└── 에러 케이스
    ├── 잘못된 전화번호
    ├── 잘못된 인증 코드
    └── 필수 필드 누락
```

---

## 🔄 Postman Collection Runner로 전체 플로우 테스트

### 순차 실행 설정

1. Collection 우클릭 → **Run Collection**
2. 순서 설정:
   - ✅ 1. SMS 인증 코드 발송
   - ⏸️ **수동으로 서버 콘솔에서 코드 확인**
   - ⏸️ **Environment의 verificationCode 업데이트**
   - ✅ 2. 전화번호 인증
   - ✅ 3. 회원가입 완료
   - ✅ 4. 내 프로필 조회
3. **Delay**: 500ms
4. **Run** 클릭

### Pre-request Script (2번 요청에 추가)

```javascript
// 서버 콘솔 확인 알림
console.log("⚠️ 서버 콘솔에서 인증 코드를 확인하고 Environment에 입력하세요!");
console.log("📋 변수명: verificationCode");

// 인증 코드가 설정되지 않았으면 경고
const code = pm.environment.get("verificationCode");
if (!code) {
    console.warn("❌ verificationCode가 설정되지 않았습니다!");
}
```

---

## 💾 환경 변수 설정

### Postman Environment

Environment Name: `DBA Auth - Signup Test`

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:3002` | `http://localhost:3002` |
| `phone` | `010-9876-5432` | `010-9876-5432` |
| `verificationCode` | (비워둠) | `847362` (서버에서 확인) |
| `accessToken` | (비워둠) | (자동 저장) |
| `refreshToken` | (비워둠) | (자동 저장) |
| `userId` | (비워둠) | (자동 저장) |

### 변수 사용 예시

Request Body에서 변수 사용:

```json
{
  "phone": "{{phone}}",
  "verificationCode": "{{verificationCode}}"
}
```

URL에서 변수 사용:

```
{{baseUrl}}/auth/send-verification
```

Header에서 변수 사용:

```
Authorization: Bearer {{accessToken}}
```

---

## ✅ 체크리스트

회원가입 테스트 전 확인:

- [ ] 서버가 실행 중 (`npm run dev`)
- [ ] 데이터베이스 연결 확인
- [ ] Postman Environment 설정 완료
- [ ] 서버 콘솔 창 열어두기 (인증 코드 확인용)
- [ ] 테스트용 전화번호 준비 (예: 010-9876-5432)

---

## 🎯 실전 팁

### 1. 서버 콘솔 모니터링

```bash
# 터미널에서 서버 실행
npm run dev

# 출력 예시
Server is running on http://localhost:3002
[SMS] Would send to 010-9876-5432: 인증코드: 847362
```

### 2. 빠른 테스트를 위한 변수 활용

Environment에 여러 전화번호 저장:

```
phone1: 010-1111-2222
phone2: 010-3333-4444
phone3: 010-5555-6666
```

Request에서 사용:

```json
{
  "phone": "{{phone1}}"
}
```

### 3. 데이터베이스 확인

```bash
# Prisma Studio 실행
npx prisma studio
```

브라우저에서 `http://localhost:5555` 접속하여:
- Users 테이블에 새 사용자 확인
- SocialAccounts 테이블에 소셜 계정 연결 확인
- PhoneVerifications 테이블에 인증 이력 확인

### 4. 토큰 디코딩

https://jwt.io 에서 Access Token 디코딩:

```json
{
  "userId": "cm3a5f8g90000v8pq4e5d2h1k",
  "iat": 1729046655,
  "exp": 1729047555
}
```

- `iat`: 발급 시간 (Unix timestamp)
- `exp`: 만료 시간 (Unix timestamp)
- Access Token: 15분 (900초) 유효

---

## 🎬 전체 플로우 영상 가이드

### 1분 만에 회원가입 테스트하기

```
1. Postman 실행
   ↓
2. "1. SMS 인증 코드 발송" 요청 Send
   ↓
3. 서버 콘솔에서 인증 코드 복사 (예: 847362)
   ↓
4. Environment → verificationCode 변수에 붙여넣기
   ↓
5. "2. 전화번호 인증" 요청 Send
   ↓
6. "3. 회원가입 완료" 요청 Send
   ↓
7. Response에서 accessToken 자동 저장 확인
   ↓
8. "4. 내 프로필 조회" 요청 Send
   ↓
✅ 회원가입 완료!
```

---

## 📚 관련 문서

- **API 전체 문서**: `API_DOCUMENTATION.md`
- **Postman 테스트 가이드**: `POSTMAN_TESTING_GUIDE.md`
- **Collection JSON**: `postman_collection.json`

---

Happy Testing! 🚀
