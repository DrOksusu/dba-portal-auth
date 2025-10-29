# 브라우저에서 소셜 로그인 테스트 가이드

실제 브라우저에서 Google/Kakao 소셜 로그인을 테스트하는 방법입니다.

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
cd D:\pythonProject\dba-portal-auth
npm run dev
```

**서버 실행 확인:**
```
Server is running on http://localhost:3002
✅ Connected to database
```

---

### 2. 테스트 페이지 열기

브라우저에서 다음 주소로 접속:

```
http://localhost:3002/test-login.html
```

또는 파일을 직접 열기:

```
D:\pythonProject\dba-portal-auth\public\test-login.html
```

---

## 🎨 테스트 페이지 사용법

### 화면 구성

```
┌─────────────────────────────────────────┐
│   🔐 소셜 로그인 테스트                  │
│   DBA Portal Auth Server                │
├─────────────────────────────────────────┤
│                                          │
│   📡 서버 상태                           │
│   ✅ 서버 정상 동작 중                   │
│                                          │
│   ┌───────────────────────────────┐     │
│   │  🔵 Google로 로그인           │     │
│   └───────────────────────────────┘     │
│                                          │
│   ┌───────────────────────────────┐     │
│   │  💛 Kakao로 로그인            │     │
│   └───────────────────────────────┘     │
│                                          │
│   💡 테스트 방법                         │
│   ✓ 위 버튼을 클릭하여 소셜 로그인 시작  │
│   ✓ OAuth 인증 페이지에서 로그인        │
│   ✓ 전화번호 인증이 필요한 경우 진행    │
│                                          │
└─────────────────────────────────────────┘
```

---

## 📋 테스트 시나리오

### 시나리오 1: Google 로그인 (신규 사용자)

#### Step 1: Google 로그인 버튼 클릭

**"Google로 로그인"** 버튼 클릭

→ Google OAuth 인증 페이지로 리다이렉트

#### Step 2: Google 계정 선택 및 로그인

Google 계정 선택 또는 로그인

→ 권한 동의 화면에서 **"허용"** 클릭

#### Step 3: 콜백 처리

**신규 사용자인 경우:**
- 서버에서 전화번호 인증이 필요하다는 응답
- 브라우저에 알림: "전화번호 인증이 필요합니다"

**이후 진행:**
1. Postman으로 전화번호 인증 진행
2. 또는 별도의 전화번호 입력 페이지 구현

---

### 시나리오 2: Kakao 로그인 (신규 사용자)

#### Step 1: Kakao 로그인 버튼 클릭

**"Kakao로 로그인"** 버튼 클릭

→ Kakao OAuth 인증 페이지로 리다이렉트

#### Step 2: Kakao 계정 로그인

QR 코드 또는 이메일/비밀번호로 로그인

→ 권한 동의 화면에서 필수 항목 체크

**동의 항목:**
- 프로필 정보 (닉네임/프로필 사진)
- 이메일 주소
- **전화번호 (선택)**

#### Step 3: 콜백 처리

**전화번호를 제공한 경우:**
- 즉시 회원가입 완료
- 토큰 발급
- 사용자 정보 표시

**전화번호를 제공하지 않은 경우:**
- 전화번호 인증 필요 알림
- Postman으로 추가 인증 진행

---

### 시나리오 3: 기존 사용자 로그인

이미 가입한 사용자가 다시 로그인하는 경우:

#### Step 1: 소셜 로그인 버튼 클릭

Google 또는 Kakao 로그인 선택

#### Step 2: 계정 인증

OAuth 인증 완료

#### Step 3: 자동 로그인

**예상 동작:**
- 즉시 로그인 완료
- 페이지에 사용자 정보 표시:
  ```
  ✅ 로그인 성공!
  User ID: cm3k8x1y20000pq9d7e8f5g6h
  전화번호: 010-1234-5678
  이름: 테스트유저
  이메일: testuser@kakao.com
  Access Token: eyJhbGciOiJIUzI1NiIs...

  [로그아웃 버튼]
  ```

---

## 🛠️ OAuth 앱 설정 (필수!)

테스트 전에 Google/Kakao OAuth 앱 설정이 필요합니다.

### Google OAuth 설정

#### 1. Google Cloud Console 접속

https://console.cloud.google.com/

#### 2. 프로젝트 생성 또는 선택

- 새 프로젝트 만들기: "DBA-Portal-Auth-Test"

#### 3. OAuth 동의 화면 설정

1. **API 및 서비스** > **OAuth 동의 화면**
2. 사용자 유형: **외부** 선택
3. 앱 정보:
   - 앱 이름: DBA Portal Auth Test
   - 사용자 지원 이메일: (본인 이메일)
   - 개발자 연락처: (본인 이메일)
4. 범위: `email`, `profile` 추가
5. 테스트 사용자 추가: (본인 Gmail 주소)

#### 4. OAuth 클라이언트 ID 생성

1. **사용자 인증 정보** > **사용자 인증 정보 만들기**
2. **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: DBA Portal Auth
5. **승인된 리디렉션 URI** 추가:
   ```
   http://localhost:3002/auth/google/callback
   ```
6. **만들기** 클릭

#### 5. 클라이언트 ID/Secret 복사

생성된 클라이언트 ID와 클라이언트 보안 비밀 복사

#### 6. .env 파일 업데이트

```env
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

---

### Kakao OAuth 설정

#### 1. Kakao Developers 접속

https://developers.kakao.com/

#### 2. 애플리케이션 추가

- **내 애플리케이션** > **애플리케이션 추가하기**
- 앱 이름: DBA Portal Auth Test
- 사업자명: (개인 이름 가능)

#### 3. 플랫폼 설정

1. **앱 설정** > **플랫폼**
2. **Web 플랫폼 등록**
3. 사이트 도메인: `http://localhost:3002`

#### 4. Kakao 로그인 활성화

1. **제품 설정** > **카카오 로그인**
2. **활성화 설정** ON
3. **Redirect URI 등록**:
   ```
   http://localhost:3002/auth/kakao/callback
   ```

#### 5. 동의 항목 설정

1. **제품 설정** > **카카오 로그인** > **동의 항목**
2. 필수 동의 항목:
   - 프로필 정보 (닉네임/프로필 사진): **필수 동의**
   - 카카오계정 (이메일): **필수 동의**
3. 선택 동의 항목:
   - 전화번호: **선택 동의**

#### 6. REST API 키 복사

1. **앱 설정** > **앱 키**
2. **REST API 키** 복사

#### 7. .env 파일 업데이트

```env
KAKAO_CLIENT_ID="your-kakao-rest-api-key-here"
KAKAO_CLIENT_SECRET=""
```

**참고:** Kakao는 Client Secret이 선택사항입니다.

---

## 🔍 브라우저 콘솔 활용

### F12 (개발자 도구) 열기

테스트 페이지에서 F12를 눌러 개발자 도구를 엽니다.

### Console 탭에서 확인할 수 있는 정보

```javascript
// 서버 상태 확인
checkServerStatus()

// 내 정보 조회
getMyInfo()

// 로그아웃
logout()

// 저장된 토큰 확인
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
```

### Network 탭에서 API 호출 확인

1. **Network** 탭 열기
2. 소셜 로그인 버튼 클릭
3. 요청/응답 확인:
   - `/auth/google` 또는 `/auth/kakao`
   - `/auth/google/callback` 또는 `/auth/kakao/callback`
   - 응답 데이터 확인

---

## 📱 전화번호 인증 플로우

### 신규 사용자 전화번호 인증

OAuth 로그인 후 전화번호 인증이 필요한 경우:

#### 1. 알림창 확인

```
전화번호 인증이 필요합니다.
별도의 인증 페이지로 이동해야 합니다.
```

#### 2. 콘솔에서 socialProfile 확인

F12 → Console에서:

```javascript
{
  provider: "kakao",
  providerId: "1234567890",
  email: "user@kakao.com",
  name: "홍길동",
  profileImage: "https://..."
}
```

#### 3. Postman으로 전화번호 인증 진행

**Step 1: SMS 발송**
```http
POST http://localhost:3002/auth/send-verification
Content-Type: application/json

{
  "phone": "010-1234-5678"
}
```

**Step 2: 인증 코드 검증**
```http
POST http://localhost:3002/auth/verify-phone
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "123456"
}
```

**Step 3: 회원가입 완료**
```http
POST http://localhost:3002/auth/complete-social-login
Content-Type: application/json

{
  "phone": "010-1234-5678",
  "verificationCode": "123456",
  "socialProfile": {
    "provider": "kakao",
    "providerId": "1234567890",
    "email": "user@kakao.com",
    "name": "홍길동",
    "profileImage": "https://..."
  }
}
```

#### 4. 토큰 저장

응답에서 받은 `accessToken`과 `refreshToken`을 브라우저에 저장:

```javascript
// F12 → Console에서 실행
localStorage.setItem('accessToken', 'eyJhbGciOiJIUzI1NiIs...');
localStorage.setItem('refreshToken', 'eyJhbGciOiJIUzI1NiIs...');
```

#### 5. 페이지 새로고침

페이지를 새로고침하면 저장된 토큰으로 사용자 정보가 표시됩니다.

---

## 🗄️ 데이터베이스 확인

### Prisma Studio로 확인

```bash
# 새 터미널 창
npx prisma studio
```

브라우저에서 `http://localhost:5555` 접속

**확인할 테이블:**
- **User**: 전화번호, 가입일시
- **SocialAccount**: Google/Kakao 계정 정보
- **JwtToken**: Access/Refresh Token

---

## ✅ 테스트 체크리스트

### Google 로그인

- [ ] OAuth 앱 설정 완료 (Client ID/Secret)
- [ ] .env 파일에 Google 설정 추가
- [ ] 서버 재시작
- [ ] 테스트 페이지에서 Google 로그인 버튼 클릭
- [ ] Google 계정 인증 완료
- [ ] 콜백 처리 확인 (신규/기존 사용자)
- [ ] DB에 데이터 저장 확인

### Kakao 로그인

- [ ] Kakao 앱 설정 완료 (REST API 키)
- [ ] .env 파일에 Kakao 설정 추가
- [ ] 서버 재시작
- [ ] 테스트 페이지에서 Kakao 로그인 버튼 클릭
- [ ] Kakao 계정 인증 완료
- [ ] 동의 항목 선택 (전화번호 포함 여부)
- [ ] 콜백 처리 확인
- [ ] DB에 데이터 저장 확인

### 전화번호 인증

- [ ] 신규 사용자로 OAuth 로그인
- [ ] 전화번호 인증 필요 알림 확인
- [ ] Postman으로 SMS 발송
- [ ] 서버 콘솔에서 인증 코드 확인
- [ ] 인증 코드 검증
- [ ] 회원가입 완료
- [ ] 토큰 발급 확인

---

## 🚨 문제 해결

### 문제 1: "redirect_uri_mismatch" 에러

**원인:**
- OAuth 앱 설정의 Redirect URI가 일치하지 않음

**해결:**
- Google: `http://localhost:3002/auth/google/callback` 정확히 입력
- Kakao: `http://localhost:3002/auth/kakao/callback` 정확히 입력
- 프로토콜(http), 도메인, 포트, 경로 모두 일치해야 함

---

### 문제 2: CORS 에러

**원인:**
- 브라우저에서 다른 도메인으로 요청 시 발생

**해결:**
`.env` 파일에서 CLIENT_URL 확인:
```env
CLIENT_URL="http://localhost:3002"
```

---

### 문제 3: "Client ID not found" 에러

**원인:**
- .env 파일에 OAuth 설정 누락
- 서버 재시작 안 함

**해결:**
1. `.env` 파일 확인:
   ```env
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   KAKAO_CLIENT_ID="..."
   ```
2. 서버 재시작:
   ```bash
   # Ctrl+C로 서버 종료 후
   npm run dev
   ```

---

### 문제 4: 페이지가 안 열림

**원인:**
- 서버가 실행되지 않음
- 포트가 다름

**해결:**
1. 서버 실행 확인: `npm run dev`
2. 올바른 URL 접속: `http://localhost:3002/test-login.html`

---

### 문제 5: 로그인 후 아무 반응 없음

**원인:**
- 콜백 URL 처리 오류
- 전화번호 인증 필요

**해결:**
1. F12 → Console 확인
2. Network 탭에서 응답 확인
3. 전화번호 인증 진행

---

## 🎯 다음 단계

### 1. 전화번호 입력 페이지 추가

`public/phone-verification.html` 생성하여:
- 전화번호 입력 폼
- SMS 인증 코드 입력
- 자동 회원가입 완료

### 2. 로그인 상태 관리

- localStorage에 토큰 저장
- 페이지 새로고침 시 자동 로그인
- 토큰 만료 시 자동 갱신

### 3. 프로필 페이지 추가

- 내 정보 표시
- 프로필 수정 폼
- 연동된 소셜 계정 목록

---

## 📚 관련 문서

- **API 문서**: `API_DOCUMENTATION.md`
- **Postman 테스트**: `POSTMAN_TESTING_GUIDE.md`
- **회원가입 → DB 확인**: `TEST_SIGNUP_TO_DB.md`

---

Happy Testing! 🚀
