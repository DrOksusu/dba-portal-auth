# DBA Portal Auth Server

Express + TypeScript + Prisma + AWS RDS MySQL을 사용한 카카오톡/구글 소셜 로그인 인증 서버

## 주요 기능

- 🔐 카카오톡 OAuth 2.0 인증
- 🔐 구글 OAuth 2.0 인증  
- 📱 CoolSMS를 통한 전화번호 인증
- 🔗 전화번호 기반 계정 통합 (동일 사용자 판별)
- 🎫 JWT Access/Refresh Token 시스템
- 📊 토큰 이력 관리
- 🛡️ 보안 미들웨어 (CORS, Rate Limiting, Helmet)

## 기술 스택

- **Backend**: Express.js, TypeScript
- **Database**: AWS RDS MySQL, Prisma ORM
- **Authentication**: Passport.js (Google, Kakao)
- **SMS**: CoolSMS API
- **Token**: JWT (jsonwebtoken)
- **Security**: CORS, Rate Limiting, Helmet

## 프로젝트 구조

```
src/
├── controllers/     # API 컨트롤러
├── middleware/      # 미들웨어 (인증, 에러처리, 보안)
├── routes/         # API 라우트
├── services/       # 비즈니스 로직
├── types/          # TypeScript 타입 정의
├── utils/          # 유틸리티 함수
├── app.ts          # Express 앱 설정
└── index.ts        # 서버 진입점
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.example`을 참고하여 `.env` 파일을 생성하고 필요한 값들을 설정합니다.

```bash
cp .env.example .env
```

필수 환경변수:
- `DATABASE_URL`: MySQL 연결 문자열
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: JWT 시크릿 키
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: 구글 OAuth 설정
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`: 카카오 OAuth 설정
- `COOLSMS_API_KEY`, `COOLSMS_API_SECRET`: CoolSMS API 키

### 3. 데이터베이스 설정
```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션
npm run prisma:migrate
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 프로덕션 빌드 및 실행
```bash
npm run build
npm start
```

## API 엔드포인트

### 인증 관련
- `GET /auth/google` - 구글 로그인 시작
- `GET /auth/kakao` - 카카오 로그인 시작
- `GET /auth/google/callback` - 구글 OAuth 콜백
- `GET /auth/kakao/callback` - 카카오 OAuth 콜백
- `POST /auth/send-verification` - SMS 인증 코드 발송
- `POST /auth/verify-phone` - 전화번호 인증 확인
- `POST /auth/complete-social-login` - 소셜 로그인 완료
- `POST /auth/refresh` - 토큰 갱신
- `POST /auth/logout` - 로그아웃

### 사용자 관련
- `GET /auth/me` - 현재 사용자 정보 조회
- `PUT /auth/profile` - 프로필 업데이트
- `DELETE /auth/account` - 계정 비활성화

### 기타
- `GET /health` - 서버 상태 확인

## 인증 플로우

### 1. 구글 로그인
1. 클라이언트에서 `/auth/google` 호출
2. 구글 OAuth 인증 페이지로 리다이렉트
3. 사용자 인증 후 `/auth/google/callback` 호출
4. 새 사용자인 경우 전화번호 인증 필요
5. 전화번호 인증 완료 후 JWT 토큰 발급

### 2. 카카오 로그인
1. 클라이언트에서 `/auth/kakao` 호출
2. 카카오 OAuth 인증 페이지로 리다이렉트
3. 사용자 인증 후 `/auth/kakao/callback` 호출
4. 카카오에서 전화번호 제공 시 바로 계정 생성
5. 그렇지 않으면 전화번호 인증 필요
6. JWT 토큰 발급

### 3. 계정 통합
- 전화번호를 기준으로 동일 사용자 판별
- 기존 사용자가 다른 소셜 로그인 시 계정 연결

## 보안 기능

- **Rate Limiting**: IP/사용자별 요청 제한
- **CORS**: Cross-Origin 요청 제어
- **Helmet**: 보안 헤더 설정
- **JWT**: Access Token (15분) + Refresh Token (7일)
- **Token Revocation**: 로그아웃 시 토큰 무효화
- **Input Validation**: 입력값 검증
- **Error Handling**: 통합 에러 처리

## 개발 시 주의사항

1. **환경변수**: 실제 서비스에서는 강력한 시크릿 키 사용
2. **SMS 발신번호**: CoolSMS에서 실제 등록된 번호로 변경 필요
3. **HTTPS**: 프로덕션에서는 HTTPS 사용 권장
4. **CORS**: 클라이언트 도메인에 맞게 CORS 설정 조정
5. **로그**: 민감한 정보 로깅 방지

## 라이센스

ISC
