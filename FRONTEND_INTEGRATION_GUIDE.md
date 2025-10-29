# 프론트엔드에서 소셜 로그인 연동 가이드

다른 프로젝트(Next.js, React, Vue 등)에서 이 인증 서버를 사용하여 로그인하는 방법입니다.

---

## 🎯 전체 플로우 (기존 사용자)

```
프론트엔드                    인증 서버                   Google/Kakao
    │                            │                            │
    │   1. 로그인 버튼 클릭       │                            │
    │ ──────────────────────────>│                            │
    │                            │   2. OAuth 인증 요청       │
    │                            │ ─────────────────────────> │
    │                            │                            │
    │                            │   3. 사용자 인증           │
    │                            │ <───────────────────────── │
    │                            │                            │
    │   4. 토큰 + 사용자 정보     │                            │
    │ <──────────────────────────│                            │
    │                            │                            │
    │   5. localStorage 저장     │                            │
    │   6. 홈으로 리다이렉트      │                            │
```

---

## 🚀 방법 1: 리다이렉트 방식 (가장 간단!)

### 프론트엔드 코드 (React/Next.js 예시)

#### 1. 로그인 페이지 (`/login`)

```jsx
// pages/login.jsx 또는 app/login/page.jsx

export default function LoginPage() {
  const handleGoogleLogin = () => {
    // 인증 서버의 Google 로그인 엔드포인트로 리다이렉트
    window.location.href = 'http://localhost:3002/auth/google';
  };

  const handleKakaoLogin = () => {
    // 인증 서버의 Kakao 로그인 엔드포인트로 리다이렉트
    window.location.href = 'http://localhost:3002/auth/kakao';
  };

  return (
    <div className="login-container">
      <h1>로그인</h1>

      <button onClick={handleGoogleLogin} className="btn-google">
        <img src="/icons/google.svg" alt="Google" />
        Google로 로그인
      </button>

      <button onClick={handleKakaoLogin} className="btn-kakao">
        <img src="/icons/kakao.svg" alt="Kakao" />
        Kakao로 로그인
      </button>
    </div>
  );
}
```

#### 2. 콜백 처리 페이지 (`/auth/callback`)

```jsx
// pages/auth/callback.jsx 또는 app/auth/callback/page.jsx

'use client'; // Next.js App Router의 경우

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URL 파라미터에서 사용자 정보 추출
    const userData = searchParams.get('user');
    const requirePhone = searchParams.get('requirePhoneVerification');
    const socialProfile = searchParams.get('socialProfile');

    if (requirePhone === 'true') {
      // 신규 사용자 - 전화번호 인증 필요
      console.log('전화번호 인증이 필요합니다');
      console.log('Social Profile:', socialProfile);

      // 전화번호 인증 페이지로 이동
      router.push(`/auth/phone-verify?profile=${encodeURIComponent(socialProfile)}`);
    } else if (userData) {
      // 기존 사용자 - 로그인 성공
      try {
        const user = JSON.parse(decodeURIComponent(userData));

        // 토큰 저장
        localStorage.setItem('accessToken', user.accessToken);
        localStorage.setItem('refreshToken', user.refreshToken);
        localStorage.setItem('userId', user.id);

        console.log('✅ 로그인 성공!', user);

        // 홈으로 리다이렉트
        router.push('/');
      } catch (error) {
        console.error('Failed to parse user data:', error);
        router.push('/login?error=invalid_data');
      }
    } else {
      // 에러 발생
      router.push('/login?error=auth_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>로그인 처리 중...</p>
    </div>
  );
}
```

#### 3. 환경 변수 설정 (`.env.local`)

```env
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:3002
```

#### 4. 로그인 상태 관리 (Context/Zustand/Redux)

**Context API 예시:**

```jsx
// contexts/AuthContext.jsx

'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 저장된 토큰으로 사용자 정보 가져오기
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3002/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        // 토큰 만료 또는 무효
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('accessToken', userData.accessToken);
    localStorage.setItem('refreshToken', userData.refreshToken);
  };

  const logout = async () => {
    const token = localStorage.getItem('accessToken');

    try {
      await fetch('http://localhost:3002/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**사용 예시:**

```jsx
// app/layout.jsx

import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

```jsx
// components/Header.jsx

import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <header>
      {user ? (
        <div>
          <span>환영합니다, {user.name || user.phone}님!</span>
          <button onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <a href="/login">로그인</a>
      )}
    </header>
  );
}
```

---

## 🔐 방법 2: 팝업 방식 (선택사항)

### 팝업으로 OAuth 인증

```jsx
// utils/authPopup.js

export function openAuthPopup(provider) {
  const width = 500;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const authUrl = `http://localhost:3002/auth/${provider}`;

  const popup = window.open(
    authUrl,
    'OAuth Login',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  return new Promise((resolve, reject) => {
    // 메시지 수신 대기
    window.addEventListener('message', function onMessage(event) {
      // 보안: origin 확인
      if (event.origin !== 'http://localhost:3002') return;

      if (event.data.type === 'AUTH_SUCCESS') {
        popup.close();
        resolve(event.data.user);
        window.removeEventListener('message', onMessage);
      } else if (event.data.type === 'AUTH_ERROR') {
        popup.close();
        reject(new Error(event.data.error));
        window.removeEventListener('message', onMessage);
      }
    });

    // 팝업이 닫혔는지 주기적으로 확인
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error('Popup closed by user'));
      }
    }, 1000);
  });
}
```

**사용 예시:**

```jsx
import { openAuthPopup } from '@/utils/authPopup';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const user = await openAuthPopup('google');

      // 토큰 저장
      localStorage.setItem('accessToken', user.accessToken);
      localStorage.setItem('refreshToken', user.refreshToken);

      // 홈으로 이동
      router.push('/');
    } catch (error) {
      console.error('Login failed:', error);
      alert('로그인에 실패했습니다.');
    }
  };

  return (
    <button onClick={handleGoogleLogin}>
      Google로 로그인
    </button>
  );
}
```

---

## 🔄 토큰 갱신 처리

### Axios Interceptor 사용

```javascript
// lib/axios.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: 모든 요청에 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: 토큰 만료 시 자동 갱신
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고, 아직 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh Token으로 새 토큰 발급
        const refreshToken = localStorage.getItem('refreshToken');

        const response = await axios.post('http://localhost:3002/auth/refresh', {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        // 새 토큰 저장
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // 원래 요청에 새 토큰 적용
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // 원래 요청 재시도
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료된 경우 로그아웃
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**사용 예시:**

```jsx
import api from '@/lib/axios';

export default function MyPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      setUser(response.data.data);
      alert('프로필이 업데이트되었습니다.');
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div>
      <h1>내 정보</h1>
      {user && (
        <div>
          <p>전화번호: {user.phone}</p>
          <p>이메일: {user.email}</p>
          <p>이름: {user.name}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🛡️ 보호된 페이지 (Protected Routes)

### Higher-Order Component (HOC)

```jsx
// components/withAuth.jsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}
```

**사용 예시:**

```jsx
// app/dashboard/page.jsx

import { withAuth } from '@/components/withAuth';

function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1>
      <p>로그인한 사용자만 볼 수 있는 페이지입니다.</p>
    </div>
  );
}

export default withAuth(DashboardPage);
```

---

## 🌐 CORS 설정 (인증 서버)

프론트엔드 도메인을 `.env`에 추가:

```env
# .env (인증 서버)

CLIENT_URL=http://localhost:3000
```

여러 도메인 허용:

```javascript
// src/app.ts

app.use(cors({
  origin: [
    'http://localhost:3000',  // 개발 환경
    'http://localhost:3001',  // 다른 프론트엔드
    'https://yourapp.com'     // 프로덕션
  ],
  credentials: true
}));
```

---

## 📱 실제 사용 시나리오

### 시나리오 1: 처음 방문한 사용자

```
1. 사용자가 yourapp.com 접속
2. 로그인 페이지로 리다이렉트
3. "Google로 로그인" 버튼 클릭
4. Google OAuth 인증 완료
5. 전화번호 인증 페이지로 이동
6. SMS 인증 완료
7. 회원가입 완료 + 토큰 발급
8. 홈으로 리다이렉트
```

### 시나리오 2: 이미 가입한 사용자 (중요!)

```
1. 사용자가 yourapp.com 접속
2. 로그인 페이지로 리다이렉트
3. "Google로 로그인" 버튼 클릭
4. Google OAuth 인증 완료
5. ✅ 즉시 토큰 발급! (전화번호 인증 불필요)
6. 홈으로 리다이렉트
7. 로그인 완료!
```

**핵심:** 이미 가입한 사용자는 OAuth 인증만으로 즉시 로그인됩니다!

### 시나리오 3: 이미 로그인된 사용자

```
1. 사용자가 yourapp.com 접속
2. localStorage에 토큰 존재 확인
3. /auth/me API로 사용자 정보 조회
4. ✅ 토큰이 유효하면 자동 로그인
5. 홈 화면 표시
```

---

## 🔧 인증 서버 콜백 URL 수정

기존 사용자가 로그인했을 때 프론트엔드로 리다이렉트하도록 수정:

### 인증 서버 수정 (이미 구현됨!)

```typescript
// src/routes/auth.routes.ts

router.get('/google/callback',
  authLimiter,
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const authResult = req.user as any;

    if (authResult.isNewUser) {
      // 신규 사용자 - 전화번호 인증 필요
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?requirePhoneVerification=true&socialProfile=${encodeURIComponent(JSON.stringify(authResult.socialProfile))}`
      );
    } else {
      // 기존 사용자 - 바로 로그인 ✅
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?user=${encodeURIComponent(JSON.stringify(authResult.user))}`
      );
    }
  }
);
```

**이미 구현되어 있으므로 수정 불필요!**

`.env`만 설정하면 됩니다:

```env
CLIENT_URL=http://localhost:3000
```

---

## 🎨 완전한 예제 (Next.js)

### 프로젝트 구조

```
my-frontend/
├── app/
│   ├── layout.jsx
│   ├── page.jsx                 # 홈
│   ├── login/
│   │   └── page.jsx             # 로그인 페이지
│   ├── auth/
│   │   └── callback/
│   │       └── page.jsx         # OAuth 콜백 처리
│   └── dashboard/
│       └── page.jsx             # 보호된 페이지
├── contexts/
│   └── AuthContext.jsx          # 인증 상태 관리
├── lib/
│   └── axios.js                 # API 클라이언트
└── .env.local
```

### 전체 코드

#### `.env.local`

```env
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:3002
```

#### `app/login/page.jsx`

```jsx
'use client';

export default function LoginPage() {
  const handleSocialLogin = (provider) => {
    window.location.href = `http://localhost:3002/auth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">로그인</h2>

        <div className="space-y-4">
          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
            Google로 로그인
          </button>

          <button
            onClick={() => handleSocialLogin('kakao')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-yellow-400 rounded-lg hover:bg-yellow-500"
          >
            <img src="/kakao-icon.svg" alt="Kakao" className="w-5 h-5" />
            Kakao로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### `app/auth/callback/page.jsx`

```jsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const userData = searchParams.get('user');
    const requirePhone = searchParams.get('requirePhoneVerification');

    if (requirePhone === 'true') {
      // 신규 사용자 - 전화번호 인증 필요
      alert('전화번호 인증이 필요합니다. 현재는 Postman으로 진행해주세요.');
      router.push('/login');
    } else if (userData) {
      // 기존 사용자 - 로그인 성공 ✅
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        login(user);
        router.push('/');
      } catch (error) {
        console.error('Parse error:', error);
        router.push('/login?error=invalid_data');
      }
    } else {
      router.push('/login?error=auth_failed');
    }
  }, [searchParams, router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>로그인 처리 중...</p>
      </div>
    </div>
  );
}
```

#### `app/page.jsx`

```jsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">환영합니다!</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">내 정보</h2>
          <p><strong>전화번호:</strong> {user.phone}</p>
          <p><strong>이름:</strong> {user.name || '미설정'}</p>
          <p><strong>이메일:</strong> {user.email || '미설정'}</p>

          {user.socialAccounts && user.socialAccounts.length > 0 && (
            <div className="mt-4">
              <strong>연동된 계정:</strong>
              {user.socialAccounts.map((account, index) => (
                <div key={index} className="ml-4 mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {account.provider}
                  </span>
                  <span className="ml-2">{account.email}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={logout}
            className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 체크리스트

### 인증 서버 설정

- [ ] `.env`에 `CLIENT_URL` 설정
- [ ] Google/Kakao OAuth Redirect URI 설정
  - Google: `http://localhost:3002/auth/google/callback`
  - Kakao: `http://localhost:3002/auth/kakao/callback`
- [ ] 서버 실행: `npm run dev`

### 프론트엔드 설정

- [ ] `.env.local`에 `NEXT_PUBLIC_AUTH_SERVER_URL` 설정
- [ ] 로그인 페이지 구현
- [ ] 콜백 페이지 구현
- [ ] AuthContext 구현
- [ ] 프론트엔드 실행: `npm run dev`

### 테스트

- [ ] 로그인 페이지에서 소셜 로그인 버튼 클릭
- [ ] OAuth 인증 완료
- [ ] 콜백 페이지로 리다이렉트
- [ ] 토큰 저장 확인 (localStorage)
- [ ] 홈 페이지에서 사용자 정보 표시
- [ ] 로그아웃 테스트

---

## 🎯 핵심 포인트

### 기존 사용자 로그인 플로우

```javascript
// 1. 로그인 버튼 클릭
window.location.href = 'http://localhost:3002/auth/google';

// 2. Google OAuth 인증

// 3. 인증 서버에서 자동으로 프론트엔드로 리다이렉트
// http://localhost:3000/auth/callback?user={userData}

// 4. 콜백 페이지에서 토큰 저장
const user = JSON.parse(decodeURIComponent(userData));
localStorage.setItem('accessToken', user.accessToken);
localStorage.setItem('refreshToken', user.refreshToken);

// 5. 홈으로 이동
router.push('/');

// ✅ 로그인 완료!
```

**이미 가입된 사용자는 전화번호 인증 없이 즉시 로그인됩니다!**

---

Happy Coding! 🚀
