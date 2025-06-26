@echo off
echo ========================================
echo    Windows 방화벽 포트 열기 (관리자 권한 필요)
echo ========================================
echo.

:: 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ 관리자 권한으로 실행됨
) else (
    echo ❌ 관리자 권한이 필요합니다!
    echo.
    echo 🔧 해결방법:
    echo    1. 이 파일을 우클릭
    echo    2. "관리자 권한으로 실행" 선택
    echo.
    pause
    exit /b 1
)

echo.
echo 📡 포트 3001 (백엔드 서버) 열기 중...
netsh advfirewall firewall add rule name="Catena Backend (3001)" dir=in action=allow protocol=TCP localport=3001

echo.
echo 🌐 포트 5173 (프론트엔드 서버) 열기 중...
netsh advfirewall firewall add rule name="Catena Frontend (5173)" dir=in action=allow protocol=TCP localport=5173

echo.
echo ========================================
echo             방화벽 설정 완료!
echo ========================================
echo ✅ 포트 3001 (백엔드) - 열림
echo ✅ 포트 5173 (프론트엔드) - 열림
echo.
echo 이제 외부에서 접속할 수 있습니다!
echo ========================================

pause