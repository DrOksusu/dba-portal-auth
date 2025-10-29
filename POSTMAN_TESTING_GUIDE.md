# Postman 테스트 가이드

DBA Portal Auth Server API를 Postman으로 테스트하는 완벽 가이드입니다.

## 📥 Postman Collection 가져오기

아래의 두 가지 방법 중 하나를 선택하세요:

### 방법 1: JSON 파일 Import
1. `postman_collection.json` 파일을 Postman에 Import
2. Collection이 자동으로 로드됨

### 방법 2: 수동으로 환경 설정
아래 단계를 따라 직접 설정

---

## ⚙️ 환경 설정 (Environment)

### 1. Postman Environment 생성

Postman에서 Environment 생성:
- Name: `DBA Auth Local`
- Variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:3002` | `http://localhost:3002` |
| `accessToken` | (비워둠) | (비워둠) |
| `refreshToken` | (비워둠) | (비워둠) |
| `userId` | (비워둠) | (비워둠) |
| `phone` | `010-1234-5678` | `010-1234-5678` |
| `verificationCode` | (비워둠) | (비워둠) |

### 2. 프로덕션 환경 추가 (선택)

- Name: `DBA Auth Production`
- `baseUrl`: `https://your-domain.com`

---

## 📁 Postman Collection 구조

```
DBA Portal Auth
├── 1. Health Check
├── 2. Authentication Flow
│   ├── 2.1 Send SMS Verification
│   ├── 2.2 Verify Phone
│   ├── 2.3 Complete Social Login
│   └── 2.4 Refresh Token
├── 3. Protected Endpoints
│   ├── 3.1 Get My Profile
│   ├── 3.2 Update Profile
│   ├── 3.3 Logout
│   └── 3.4 Deactivate Account
└── 4. Social Login (Manual)
    ├── 4.1 Google Login (Browser)
    └── 4.2 Kakao Login (Browser)
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 신규 사용자 회원가입 + 로그인

#### Step 1: Health Check
```http
GET {{baseUrl}}/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-10-16T...",
    "uptime": 123.456
  },
  "message": "Server is healthy"
}
```

#### Step 2: SMS 인증 코드 발송
```http
POST {{baseUrl}}/auth/send-verification
Content-Type: application/json

{
  "phone": "{{phone}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": null,
  "message": "인증 코드가 발송되었습니다."
}
```

**중요:**
- 개발 환경에서는 서버 콘솔에 인증 코드 출력
- 실제 SMS는 발송되지 않음
- 콘솔에서 코드를 복사하여 사용

**서버 콘솔 확인:**
```
[SMS] Would send to 010-1234-5678: 인증코드: 123456
```

#### Step 3: 전화번호 인증
```http
POST {{baseUrl}}/auth/verify-phone
Content-Type: application/json

{
  "phone": "{{phone}}",
  "verificationCode": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "verified": true
  },
  "message": "전화번호 인증이 완료되었습니다."
}
```

#### Step 4: 소셜 로그인 완료 (회원가입)
```http
POST {{baseUrl}}/auth/complete-social-login
Content-Type: application/json

{
  "phone": "{{phone}}",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "1234567890",
    "email": "test@kakao.com",
    "name": "테스트사용자",
    "profileImage": "https://example.com/profile.jpg"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm...",
      "phone": "010-1234-5678",
      "name": null,
      "email": null,
      "profileImage": null,
      "isActive": true,
      "createdAt": "2025-10-16T...",
      "updatedAt": "2025-10-16T..."
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "isNewUser": true
  },
  "message": "로그인이 완료되었습니다."
}
```

**Post-response Script (자동 토큰 저장):**
```javascript
// Tests 탭에 추가
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data.tokens) {
        pm.environment.set("accessToken", response.data.tokens.accessToken);
        pm.environment.set("refreshToken", response.data.tokens.refreshToken);
        pm.environment.set("userId", response.data.user.id);
        console.log("✅ Tokens saved to environment");
    }
}
```

---

### 시나리오 2: 인증된 사용자 API 테스트

#### Step 5: 내 프로필 조회
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{accessToken}}
```

**Headers 설정:**
```
Authorization: Bearer {{accessToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "phone": "010-1234-5678",
    "name": "테스트사용자",
    "email": "test@kakao.com",
    "profileImage": "https://example.com/profile.jpg",
    "isActive": true,
    "createdAt": "2025-10-16T...",
    "updatedAt": "2025-10-16T...",
    "socialAccounts": [
      {
        "provider": "kakao",
        "email": "test@kakao.com",
        "name": "테스트사용자",
        "profileImage": "https://example.com/profile.jpg"
      }
    ]
  },
  "message": "사용자 정보를 조회했습니다."
}
```

#### Step 6: 프로필 수정
```http
PUT {{baseUrl}}/auth/profile
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "수정된이름",
  "email": "newemail@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "phone": "010-1234-5678",
    "name": "수정된이름",
    "email": "newemail@example.com",
    "profileImage": "https://example.com/profile.jpg",
    "isActive": true,
    "createdAt": "2025-10-16T...",
    "updatedAt": "2025-10-16T..."
  },
  "message": "프로필이 업데이트되었습니다."
}
```

---

### 시나리오 3: 토큰 갱신 테스트

#### Step 7: Access Token 만료 시뮬레이션

**방법 1: 환경변수에서 accessToken 삭제**
```
Environment에서 accessToken 값을 비우기
```

**방법 2: 잘못된 토큰 사용**
```
accessToken을 "invalid_token"으로 변경
```

#### Step 8: 프로필 조회 (실패 확인)
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer invalid_token
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "유효하지 않은 토큰입니다."
}
```

#### Step 9: 토큰 갱신
```http
POST {{baseUrl}}/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  },
  "message": "토큰이 갱신되었습니다."
}
```

**Post-response Script:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data.tokens) {
        pm.environment.set("accessToken", response.data.tokens.accessToken);
        pm.environment.set("refreshToken", response.data.tokens.refreshToken);
        console.log("✅ Tokens refreshed");
    }
}
```

#### Step 10: 프로필 조회 재시도 (성공 확인)
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{accessToken}}
```

---

### 시나리오 4: 로그아웃 및 계정 관리

#### Step 11: 로그아웃
```http
POST {{baseUrl}}/auth/logout
Authorization: Bearer {{accessToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": null,
  "message": "로그아웃이 완료되었습니다."
}
```

**Post-response Script (토큰 삭제):**
```javascript
if (pm.response.code === 200) {
    pm.environment.unset("accessToken");
    pm.environment.unset("refreshToken");
    console.log("✅ Logged out, tokens cleared");
}
```

#### Step 12: 로그아웃 후 API 호출 (실패 확인)
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{accessToken}}
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "유효하지 않은 토큰입니다."
}
```

#### Step 13: 계정 비활성화 (선택)
```http
DELETE {{baseUrl}}/auth/account
Authorization: Bearer {{accessToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": null,
  "message": "계정이 비활성화되었습니다."
}
```

---

## 🔐 Authorization 설정

### Collection 레벨 Authorization 설정

1. Collection 우클릭 → Edit
2. Authorization 탭 선택
3. Type: `Bearer Token`
4. Token: `{{accessToken}}`
5. Save

이렇게 하면 모든 요청에 자동으로 Bearer Token이 추가됩니다.

### 개별 요청 Override

인증이 필요 없는 요청(Health Check, Send Verification 등)은:
1. 해당 요청의 Authorization 탭
2. Type: `No Auth` 선택

---

## 🧩 Postman Tests (자동화)

각 요청의 Tests 탭에 추가할 스크립트:

### 1. Health Check 테스트
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Health status is OK", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data.status).to.eql("OK");
});
```

### 2. SMS 발송 테스트
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("SMS sent successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("발송");
});
```

### 3. 로그인 완료 테스트
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Tokens are returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data.tokens).to.have.property("accessToken");
    pm.expect(jsonData.data.tokens).to.have.property("refreshToken");
});

// 자동으로 토큰 저장
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data.tokens) {
        pm.environment.set("accessToken", response.data.tokens.accessToken);
        pm.environment.set("refreshToken", response.data.tokens.refreshToken);
        pm.environment.set("userId", response.data.user.id);
    }
}
```

### 4. 인증 필요 API 테스트
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("User data is returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property("id");
    pm.expect(jsonData.data).to.have.property("phone");
});
```

---

## 🚨 에러 케이스 테스트

### 1. 잘못된 전화번호 형식
```http
POST {{baseUrl}}/auth/send-verification
Content-Type: application/json

{
  "phone": "invalid-phone"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "유효하지 않은 전화번호 형식입니다."
}
```

### 2. 잘못된 인증 코드
```http
POST {{baseUrl}}/auth/verify-phone
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "000000"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "인증 코드가 일치하지 않습니다."
}
```

### 3. 만료된 인증 코드
```
인증 코드 발송 후 5분 대기 후 테스트
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "인증 코드가 만료되었습니다."
}
```

### 4. Authorization 헤더 누락
```http
GET {{baseUrl}}/auth/me
# Authorization 헤더 없음
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

### 5. 만료된 Access Token
```
15분 후 테스트 또는 수동으로 만료된 토큰 사용
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "토큰이 만료되었습니다."
}
```

### 6. Rate Limit 초과
```
SMS 발송 API를 30초 내에 2번 호출
```

**Expected Response (429):**
```json
{
  "success": false,
  "message": "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
}
```

---

## 📊 Collection Runner 사용

전체 시나리오를 자동으로 실행:

1. Collection 우클릭 → Run Collection
2. Environment 선택: `DBA Auth Local`
3. Iterations: 1
4. Delay: 500ms
5. Run 클릭

**주의사항:**
- SMS 발송과 인증 코드 검증 사이에 서버 콘솔에서 코드 확인 필요
- 자동 실행 시 인증 코드를 미리 알 수 없으므로 수동 테스트 권장

---

## 🔧 Pre-request Script (고급)

### Collection 레벨 Pre-request Script

모든 요청 전에 실행:

```javascript
// 현재 타임스탬프
pm.globals.set("timestamp", new Date().toISOString());

// 요청 로깅
console.log(`🚀 ${pm.request.method} ${pm.request.url}`);
```

### 개별 요청 Pre-request Script

토큰 자동 갱신 (선택):

```javascript
// Access Token 만료 체크 및 자동 갱신
const accessToken = pm.environment.get("accessToken");
if (accessToken) {
    try {
        // JWT 디코딩 (간단한 방법)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const exp = payload.exp * 1000; // 밀리초로 변환
        const now = Date.now();

        // 만료 5분 전이면 갱신
        if (exp - now < 5 * 60 * 1000) {
            console.log("⚠️ Token expiring soon, refreshing...");
            // Refresh Token API 호출
        }
    } catch (e) {
        console.log("⚠️ Token validation error:", e);
    }
}
```

---

## 📝 변수 관리 팁

### 동적 변수 사용

Postman 내장 변수:
```
{{$randomInt}}        # 랜덤 정수
{{$randomEmail}}      # 랜덤 이메일
{{$randomPhoneNumber}} # 랜덤 전화번호
{{$timestamp}}        # 현재 타임스탬프
{{$guid}}            # GUID
```

### 환경별 전화번호 관리

```javascript
// 환경에 따라 다른 전화번호 사용
const environment = pm.environment.name;
let phone;

if (environment === "DBA Auth Local") {
    phone = "010-1234-5678"; // 테스트 번호
} else if (environment === "DBA Auth Production") {
    phone = pm.environment.get("phone"); // 실제 번호
}

pm.environment.set("phone", phone);
```

---

## 🎯 실전 팁

### 1. 서버 실행 확인
```bash
# 터미널에서 서버 실행
cd dba-portal-auth
npm run dev
```

서버 콘솔 확인:
```
Server is running on http://localhost:3002
```

### 2. 인증 코드 확인
SMS 발송 후 서버 콘솔에서:
```
[SMS] Would send to 010-1234-5678: 인증코드: 123456
```

### 3. 토큰 디버깅
JWT.io (https://jwt.io)에서 토큰 디코딩:
- Header, Payload, Signature 확인
- 만료 시간(exp) 확인

### 4. 데이터베이스 확인
```bash
# Prisma Studio 실행
npx prisma studio
```

브라우저에서 데이터 확인 가능

### 5. 로그 모니터링
서버 콘솔에서 실시간 로그 확인:
```
POST /auth/send-verification 200 123ms
POST /auth/verify-phone 200 45ms
POST /auth/complete-social-login 200 234ms
```

---

## 🆘 트러블슈팅

### 문제 1: Connection Refused
**원인:** 서버가 실행되지 않음
**해결:** `npm run dev`로 서버 실행

### 문제 2: CORS Error
**원인:** 브라우저에서 직접 요청 시 발생
**해결:** Postman 사용 (CORS 정책 우회)

### 문제 3: 401 Unauthorized
**원인:** Access Token 만료 또는 잘못됨
**해결:** Refresh Token으로 갱신 또는 재로그인

### 문제 4: 429 Too Many Requests
**원인:** Rate Limit 초과
**해결:** 30초~1분 대기 후 재시도

### 문제 5: 500 Internal Server Error
**원인:** 서버 오류
**해결:**
1. 서버 콘솔에서 에러 로그 확인
2. 데이터베이스 연결 확인
3. 환경변수 확인

---

## 📚 추가 리소스

- **API 문서**: `API_DOCUMENTATION.md`
- **배포 가이드**: `LIGHTSAIL_DEPLOYMENT.md`
- **프로젝트 구조**: `README.md`

---

## ✅ 체크리스트

테스트 전 확인 사항:
- [ ] 서버 실행 중 (`npm run dev`)
- [ ] 데이터베이스 연결 확인
- [ ] Postman Environment 설정 완료
- [ ] Collection Import 완료
- [ ] 서버 콘솔 열어두기 (인증 코드 확인용)

Happy Testing! 🚀
