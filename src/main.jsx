import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from '@/App.jsx'
import '@/index.css'
//import { initializeKeepAlive } from '@/api/serverAPI'

// Google OAuth Client ID (환경변수 또는 기본값)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
    '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com' // 개발용 임시 ID

console.log('[Google OAuth] Client ID:', GOOGLE_CLIENT_ID);

// 🚀 Keep-Alive 시스템 자동 초기화 (Render.com 슬립 방지)
//initializeKeepAlive();

ReactDOM.createRoot(document.getElementById('root')).render(
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
    </GoogleOAuthProvider>
)
