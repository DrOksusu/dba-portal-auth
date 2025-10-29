# 배포 가이드

## AWS RDS MySQL 설정

### 1. RDS 인스턴스 생성

1. AWS Console에서 RDS 서비스로 이동
2. "데이터베이스 생성" 클릭
3. 다음 설정으로 생성:
   - 엔진: MySQL 8.0 이상
   - 템플릿: 프리 티어 또는 프로덕션
   - DB 인스턴스 식별자: `dba-portal-auth-db`
   - 마스터 사용자 이름: `admin` (또는 원하는 이름)
   - 마스터 암호: 강력한 암호 설정
   - 퍼블릭 액세스: 예 (개발 시) / 아니오 (프로덕션)
   - 보안 그룹: 3306 포트 허용

### 2. 데이터베이스 연결 문자열

RDS 엔드포인트를 확인하고 `.env` 파일에 설정:

```env
DATABASE_URL="mysql://username:password@your-rds-endpoint:3306/dba_portal_auth"
```

### 3. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
npm run prisma:migrate

# 또는 프로덕션 환경
npm run prisma:deploy
```

---

## OAuth 설정

### Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택
5. 애플리케이션 유형: 웹 애플리케이션
6. 승인된 리디렉션 URI 추가:
   - 개발: `http://localhost:3000/auth/google/callback`
   - 프로덕션: `https://your-domain.com/auth/google/callback`
7. 클라이언트 ID와 클라이언트 보안 비밀번호를 `.env`에 설정

### 카카오 OAuth 설정

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 애플리케이션 생성
3. "제품 설정" > "카카오 로그인" 활성화
4. Redirect URI 설정:
   - 개발: `http://localhost:3000/auth/kakao/callback`
   - 프로덕션: `https://your-domain.com/auth/kakao/callback`
5. 동의 항목 설정: 전화번호, 이메일, 프로필 정보
6. REST API 키를 `.env`에 설정

---

## CoolSMS 설정

1. [CoolSMS](https://www.coolsms.co.kr/) 회원가입
2. API Key 발급
3. 발신번호 등록 (인증 필요)
4. API Key와 API Secret을 `.env`에 설정
5. `src/services/sms.service.ts`에서 발신번호 변경:
   ```typescript
   from: '01012345678', // 실제 등록한 발신번호로 변경
   ```

---

## 환경변수 설정

### 개발 환경 (.env)

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/dba_portal_auth"

# JWT Secrets (강력한 랜덤 문자열 사용)
JWT_ACCESS_SECRET="your_very_strong_access_secret_here"
JWT_REFRESH_SECRET="your_very_strong_refresh_secret_here"

# OAuth - Google
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# OAuth - Kakao
KAKAO_CLIENT_ID="your_kakao_client_id"
KAKAO_CLIENT_SECRET="your_kakao_client_secret"

# CoolSMS
COOLSMS_API_KEY="your_coolsms_api_key"
COOLSMS_API_SECRET="your_coolsms_api_secret"

# Server
PORT=3000
NODE_ENV=development

# Client URLs
CLIENT_URL="http://localhost:3000"
REDIRECT_URL="http://localhost:3000/auth/callback"
```

### 프로덕션 환경

- 모든 시크릿 키는 강력한 랜덤 문자열 사용
- `NODE_ENV=production`으로 설정
- HTTPS 사용 (Let's Encrypt 권장)
- CLIENT_URL과 REDIRECT_URL을 실제 도메인으로 변경

---

## 서버 배포

### Docker 사용 (권장)

1. Dockerfile 작성:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

2. Docker 이미지 빌드:

```bash
docker build -t dba-portal-auth .
```

3. Docker 컨테이너 실행:

```bash
docker run -d \
  --name dba-portal-auth \
  -p 3000:3000 \
  --env-file .env \
  dba-portal-auth
```

### PM2 사용

1. PM2 설치:

```bash
npm install -g pm2
```

2. 프로덕션 빌드:

```bash
npm run build
```

3. PM2로 실행:

```bash
pm2 start dist/index.js --name dba-portal-auth
pm2 save
pm2 startup
```

### AWS EC2 배포

1. EC2 인스턴스 생성 (Ubuntu 20.04 LTS)
2. Node.js 설치
3. 프로젝트 클론
4. 의존성 설치 및 빌드
5. PM2 또는 Docker로 실행
6. Nginx를 리버스 프록시로 설정

---

## Nginx 설정 (선택사항)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

SSL 인증서 설치 (Let's Encrypt):

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 모니터링 및 로그

### 로그 확인

PM2 사용 시:
```bash
pm2 logs dba-portal-auth
```

Docker 사용 시:
```bash
docker logs dba-portal-auth
```

### 성능 모니터링

PM2 사용 시:
```bash
pm2 monit
```

---

## 보안 체크리스트

- [ ] 강력한 JWT 시크릿 키 사용
- [ ] HTTPS 사용 (프로덕션)
- [ ] 환경변수 파일 (.env)을 버전 관리에 포함하지 않음
- [ ] CORS 설정을 실제 클라이언트 도메인으로 제한
- [ ] Rate Limiting 적절히 설정
- [ ] 데이터베이스 백업 설정
- [ ] 정기적인 보안 업데이트
- [ ] 로그에서 민감한 정보 제거
- [ ] RDS 보안 그룹 제대로 설정
- [ ] CoolSMS 발신번호 실제 등록된 번호 사용

---

## 문제 해결

### 데이터베이스 연결 실패

- RDS 보안 그룹에서 3306 포트가 허용되어 있는지 확인
- 연결 문자열이 올바른지 확인
- RDS가 퍼블릭 액세스 가능한지 확인 (개발 환경)

### OAuth 리다이렉트 오류

- OAuth 설정에서 리다이렉트 URI가 정확히 일치하는지 확인
- 프로토콜 (http/https)이 일치하는지 확인

### SMS 발송 실패

- CoolSMS API 키가 올바른지 확인
- 발신번호가 실제 등록되어 있는지 확인
- 잔액이 충분한지 확인
- 개발 환경에서는 콘솔에 로그만 출력됨

---

## 유지보수

### 데이터베이스 마이그레이션

스키마 변경 시:

```bash
# 마이그레이션 생성
npx prisma migrate dev --name migration_name

# 프로덕션 배포
npx prisma migrate deploy
```

### 의존성 업데이트

```bash
# 보안 취약점 확인
npm audit

# 업데이트
npm update
```
