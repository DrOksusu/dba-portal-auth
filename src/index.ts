import dotenv from 'dotenv';
import app from './app';
import { prisma } from './services/prisma.service';
import { JwtTokenService } from './services/jwt-token.service';

// 환경변수 로드
dotenv.config();

const PORT = process.env.PORT || 3000;

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 확인
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 만료된 토큰 정리 (서버 시작 시)
    await JwtTokenService.cleanupExpiredTokens();
    console.log('🧹 만료된 토큰 정리 완료');

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📝 API 문서: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 개발 모드로 실행 중');
        console.log('📱 SMS는 콘솔에 출력됩니다');
      }
    });

    // 정기적으로 만료된 토큰 정리 (1시간마다)
    setInterval(async () => {
      try {
        await JwtTokenService.cleanupExpiredTokens();
        console.log('🧹 정기 토큰 정리 완료');
      } catch (error) {
        console.error('❌ 토큰 정리 중 오류:', error);
      }
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 서버 종료 중...');
  
  try {
    await prisma.$disconnect();
    console.log('✅ 데이터베이스 연결 종료');
    process.exit(0);
  } catch (error) {
    console.error('❌ 종료 중 오류:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM 신호 수신, 서버 종료 중...');
  
  try {
    await prisma.$disconnect();
    console.log('✅ 데이터베이스 연결 종료');
    process.exit(0);
  } catch (error) {
    console.error('❌ 종료 중 오류:', error);
    process.exit(1);
  }
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

startServer();
