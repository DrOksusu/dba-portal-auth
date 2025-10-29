# AWS Lightsail Docker 배포 가이드

이 가이드는 AWS Lightsail에서 Docker를 사용하여 DBA Portal Auth 서버를 배포하는 방법을 설명합니다.

## 📋 사전 준비

### 1. AWS Lightsail 인스턴스 생성

1. [AWS Lightsail Console](https://lightsail.aws.amazon.com/) 접속
2. "인스턴스 생성" 클릭
3. 다음 설정 선택:
   - **플랫폼**: Linux/Unix
   - **블루프린트**: OS 전용 → Ubuntu 22.04 LTS
   - **인스턴스 플랜**: 최소 $5/월 (512MB RAM 이상)
   - **인스턴스 이름**: `dba-portal-auth-server`

4. "인스턴스 생성" 클릭

### 2. 고정 IP 연결

1. Lightsail 콘솔에서 "네트워킹" 탭
2. "고정 IP 생성"
3. 생성한 인스턴스에 연결

### 3. 방화벽 규칙 설정

인스턴스 → 네트워킹 탭에서 다음 포트 추가:
- **SSH**: 22 (기본값)
- **HTTP**: 80
- **HTTPS**: 443
- **Custom**: 3002 (애플리케이션 포트)

---

## 🚀 배포 단계

### Step 1: SSH 접속

```bash
# Lightsail 콘솔에서 "SSH를 사용하여 연결" 클릭
# 또는 터미널에서:
ssh -i /path/to/key.pem ubuntu@YOUR_LIGHTSAIL_IP
```

### Step 2: Docker 설치

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo apt install docker-compose -y

# Docker를 sudo 없이 실행 (선택사항)
sudo usermod -aG docker $USER
newgrp docker

# Docker 설치 확인
docker --version
docker-compose --version
```

### Step 3: Git 설치 및 프로젝트 클론

```bash
# Git 설치
sudo apt install git -y

# 프로젝트 클론 (GitHub/GitLab 등에서)
git clone https://your-repo-url/dba-portal-auth.git
cd dba-portal-auth

# 또는 파일 업로드 (scp 사용)
# 로컬에서 실행:
# scp -i /path/to/key.pem -r ./dba-portal-auth ubuntu@YOUR_LIGHTSAIL_IP:~/
```

### Step 4: 환경변수 설정

```bash
# .env 파일 생성
nano .env
```

다음 내용 입력 (실제 값으로 변경):

```env
# Database (AWS RDS MySQL)
DATABASE_URL="mysql://username:password@your-rds-endpoint:3306/dba_portal_auth"

# JWT Secrets (강력한 랜덤 문자열)
JWT_ACCESS_SECRET="your_very_strong_access_secret"
JWT_REFRESH_SECRET="your_very_strong_refresh_secret"

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
PORT=3002
NODE_ENV=production

# Client URLs (실제 도메인으로 변경)
CLIENT_URL="https://your-frontend-domain.com"
REDIRECT_URL="https://your-auth-domain.com/auth/callback"
```

저장: `Ctrl + O` → `Enter` → `Ctrl + X`

### Step 5: 데이터베이스 마이그레이션

```bash
# Prisma Client 생성 및 마이그레이션
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  --env-file .env \
  node:20-alpine \
  sh -c "npm install && npx prisma generate && npx prisma migrate deploy"
```

### Step 6: Docker 이미지 빌드

```bash
# Docker 이미지 빌드
docker build -t dba-portal-auth .

# 빌드 확인
docker images
```

### Step 7: Docker 컨테이너 실행

#### 방법 1: Docker Run (간단)

```bash
docker run -d \
  --name dba-portal-auth \
  -p 3002:3002 \
  --env-file .env \
  --restart unless-stopped \
  dba-portal-auth

# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs -f dba-portal-auth
```

#### 방법 2: Docker Compose (권장)

```bash
# Docker Compose로 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

### Step 8: 서버 동작 확인

```bash
# 헬스체크
curl http://localhost:3002/health

# 외부에서 접속 테스트
curl http://YOUR_LIGHTSAIL_IP:3002/health
```

정상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-10-16T..."
}
```

---

## 🔒 HTTPS 설정 (Nginx + Let's Encrypt)

### Step 1: Nginx 설치

```bash
sudo apt install nginx -y
```

### Step 2: Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/dba-portal-auth
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 실제 도메인으로 변경

    location / {
        proxy_pass http://localhost:3002;
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

설정 활성화:

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/dba-portal-auth /etc/nginx/sites-enabled/

# 기본 설정 제거 (선택)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### Step 3: SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 및 자동 설정
sudo certbot --nginx -d your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 🔄 업데이트 및 재배포

### 코드 업데이트 시

```bash
# 프로젝트 디렉토리로 이동
cd ~/dba-portal-auth

# Git Pull (코드 업데이트)
git pull

# 기존 컨테이너 중지 및 제거
docker-compose down

# 이미지 재빌드
docker-compose build

# 컨테이너 재시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 데이터베이스 스키마 변경 시

```bash
# 마이그레이션 실행
docker-compose exec app npx prisma migrate deploy

# 또는 컨테이너 외부에서:
npx prisma migrate deploy
```

---

## 📊 모니터링 및 관리

### 컨테이너 관리 명령어

```bash
# 컨테이너 상태 확인
docker ps -a

# 로그 확인 (실시간)
docker logs -f dba-portal-auth

# 로그 확인 (마지막 100줄)
docker logs --tail 100 dba-portal-auth

# 컨테이너 재시작
docker restart dba-portal-auth

# 컨테이너 중지
docker stop dba-portal-auth

# 컨테이너 시작
docker start dba-portal-auth

# 컨테이너 내부 접속
docker exec -it dba-portal-auth sh
```

### 리소스 모니터링

```bash
# Docker 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h

# 시스템 모니터링
htop  # 설치: sudo apt install htop
```

### 로그 관리

```bash
# Docker 로그 크기 제한 (docker-compose.yml에 추가)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 🛡️ 보안 체크리스트

- [ ] SSH 키 기반 인증 사용 (비밀번호 인증 비활성화)
- [ ] 방화벽 규칙 최소 권한 설정
- [ ] .env 파일 권한 설정: `chmod 600 .env`
- [ ] HTTPS 사용 (Let's Encrypt)
- [ ] 정기적인 시스템 업데이트: `sudo apt update && sudo apt upgrade`
- [ ] Docker 이미지 정기 업데이트
- [ ] RDS 보안 그룹에서 Lightsail IP만 허용
- [ ] 강력한 JWT Secret 사용
- [ ] CORS 설정을 실제 프론트엔드 도메인으로 제한

---

## 🚨 문제 해결

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker logs dba-portal-auth

# 환경변수 확인
docker exec dba-portal-auth env
```

### 데이터베이스 연결 실패

```bash
# RDS 연결 테스트
mysql -h your-rds-endpoint -u username -p

# Lightsail 보안 그룹 확인
# RDS 보안 그룹에 Lightsail IP 추가 필요
```

### 포트 충돌

```bash
# 3002 포트 사용 확인
sudo lsof -i :3002

# 사용 중인 프로세스 종료
sudo kill -9 <PID>
```

### 디스크 공간 부족

```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a

# 로그 파일 정리
docker logs --tail 0 dba-portal-auth
```

---

## 💰 비용 최적화

**Lightsail 인스턴스 플랜 추천**:
- 개발/테스트: $5/월 (512MB RAM)
- 소규모 프로덕션: $10/월 (1GB RAM)
- 중규모 프로덕션: $20/월 (2GB RAM)

**추가 비용**:
- AWS RDS MySQL (Free Tier 또는 별도)
- 고정 IP (첫 1개 무료)
- 데이터 전송 (월 1TB 포함)

---

## 📝 다른 프로젝트에서 사용하기

### API 엔드포인트

배포 후 다른 프로젝트에서 다음과 같이 사용:

```typescript
// 예: Next.js 프론트엔드
const API_URL = 'https://auth.yourdomain.com';

// 소셜 로그인
window.location.href = `${API_URL}/auth/google`;

// API 호출
const response = await fetch(`${API_URL}/auth/me`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### CORS 설정 확인

`src/app.ts`에서 프론트엔드 도메인 추가:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.com',
    'http://localhost:3000'  // 개발용
  ],
  credentials: true
}));
```

---

## 📞 지원

문제 발생 시:
1. `docker logs` 확인
2. `/health` 엔드포인트 테스트
3. 환경변수 확인
4. RDS 연결 확인

Happy Deploying! 🚀
