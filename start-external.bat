@echo off
echo ========================================
echo    Catena CTA 예측 게임 - 외부 접속 가능
echo ========================================
echo.

echo 1. 백엔드 서버 시작 중...
cd /d "C:\MYCREATA\catena-backend"
start "Backend Server" cmd /k "node server.js"

echo.
echo 2. 잠시 대기 중... (백엔드 서버 초기화)
timeout /t 3 /nobreak >nul

echo.
echo 3. 프론트엔드 서버 시작 중...
cd /d "C:\MYCREATA\catena-predict(base44버전)"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo 4. 네트워크 정보 확인 중...
echo.
echo ========================================
echo           네트워크 접속 정보
echo ========================================

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo 🌐 외부 접속 주소: http://%%j:5173
    )
)

echo.
echo 🔧 백엔드 API 주소:
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo    http://%%j:3001
    )
)

echo.
echo ========================================
echo             중요 안내사항
echo ========================================
echo 📱 휴대폰이나 다른 컴퓨터에서 접속하려면:
echo    위의 "외부 접속 주소"를 웹브라우저에 입력하세요
echo.
echo 🔥 Windows 방화벽 허용 필요:
echo    - 포트 3001 (백엔드)
echo    - 포트 5173 (프론트엔드)
echo.
echo 🌐 같은 WiFi 네트워크에 연결된 기기에서만 접속 가능
echo ========================================

pause