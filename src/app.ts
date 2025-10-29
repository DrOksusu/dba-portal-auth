import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import passport from './middleware/passport.middleware';
import { ErrorMiddleware } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate-limit.middleware';
import authRoutes from './routes/auth.routes';
import { ResponseUtil } from './utils/response.util';

const app = express();

// 보안 미들웨어
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 로깅
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 세션 설정 (OAuth용)
app.use(session({
  secret: process.env.JWT_ACCESS_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 정적 파일 제공 (테스트 페이지용)
app.use(express.static('public'));

// 레이트 리미팅
app.use(generalLimiter);

// Health Check
app.get('/health', (req, res) => {
  ResponseUtil.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Server is healthy');
});

// API 라우트
app.use('/auth', authRoutes);

// 404 처리 (모든 경로)
app.use(ErrorMiddleware.notFound);

// 전역 에러 처리
app.use(ErrorMiddleware.handle);

export default app;
