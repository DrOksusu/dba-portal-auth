# 카카오톡/구글 소셜 로그인 인증 서버 구축

## 프로젝트 개요
Express + TypeScript + Prisma + AWS RDS MySQL을 사용하여 카카오톡/구글 소셜 로그인과 SMS 인증을 통한 통합 인증 서버를 구축합니다.

## 주요 기능
- 카카오톡 OAuth 2.0 인증
- 구글 OAuth 2.0 인증  
- CoolSMS를 통한 전화번호 인증
- 전화번호 기반 계정 통합 (동일 사용자 판별)
- JWT Access/Refresh Token 시스템
- 토큰 이력 관리

## 프로젝트 구조 및 초기 설정
- Express + TypeScript 프로젝트 초기화
- 필요한 의존성 설치 (express, prisma, passport, jsonwebtoken, coolsms 등)
- 환경변수 설정 (.env 파일)
- TypeScript 설정 및 빌드 환경 구성

## 데이터베이스 설계 (Prisma)
- **User 모델**: 기본 정보 + 확장 프로필 정보
- **SocialAccount 모델**: 소셜 로그인 계정 연결 정보  
- **JwtToken 모델**: JWT 토큰 발급/사용 이력 관리
- **PhoneVerification 모델**: 전화번호 인증 이력
- AWS RDS MySQL 연결 설정

## 인증 플로우 구현
- 카카오톡 OAuth 2.0 인증 (passport-kakao)
- 구글 OAuth 2.0 인증 (passport-google-oauth20)
- 전화번호 인증 (CoolSMS API 연동)
- 계정 통합 로직 (전화번호 기준 동일 사용자 판별)

## JWT 토큰 시스템
- Access Token (15분) + Refresh Token (7일) 구조
- 토큰 발급/갱신/검증 미들웨어
- 토큰 이력 데이터베이스 저장

## API 엔드포인트 구현
- REST API 표준 응답 구조 (status, data, message)
- 소셜 로그인 시작/콜백 처리
- SMS 인증 요청/확인
- 토큰 갱신 및 사용자 정보 조회

## 보안 및 에러 처리
- CORS 설정, 레이트 리미팅
- 입력값 검증 및 보안 헤더
- 통합 에러 처리 시스템

## 구현 단계

### 1단계: 프로젝트 초기화
- [x] Express + TypeScript 프로젝트 초기화
- [ ] 필요한 의존성 설치
- [ ] TypeScript 및 환경 설정

### 2단계: 데이터베이스 설계
- [ ] Prisma 스키마 설계
- [ ] AWS RDS MySQL 연결 설정
- [ ] 데이터베이스 마이그레이션

### 3단계: 인증 시스템 구현
- [ ] 카카오톡 OAuth 인증 전략 구현
- [ ] 구글 OAuth 인증 전략 구현
- [ ] CoolSMS 전화번호 인증 시스템 구현

### 4단계: JWT 토큰 시스템
- [ ] JWT Access/Refresh 토큰 구현
- [ ] 토큰 검증 미들웨어 구현
- [ ] 토큰 이력 관리 시스템

### 5단계: API 엔드포인트
- [ ] 인증 관련 REST API 구현
- [ ] 표준 응답 구조 적용
- [ ] API 문서화

### 6단계: 계정 통합 및 보안
- [ ] 전화번호 기반 계정 통합 로직
- [ ] 보안 미들웨어 구현
- [ ] 에러 처리 시스템 구현

## 기술 스택
- **Backend**: Express.js, TypeScript
- **Database**: AWS RDS MySQL, Prisma ORM
- **Authentication**: Passport.js (Google, Kakao)
- **SMS**: CoolSMS API
- **Token**: JWT (jsonwebtoken)
- **Security**: CORS, Rate Limiting, Helmet

## 환경 변수 (예시)
```env
DATABASE_URL="mysql://user:password@host:port/database"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
KAKAO_CLIENT_ID="your_kakao_client_id"
KAKAO_CLIENT_SECRET="your_kakao_client_secret"
COOLSMS_API_KEY="your_coolsms_api_key"
COOLSMS_API_SECRET="your_coolsms_api_secret"
```
