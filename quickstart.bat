@echo off
REM Quick Start Script for Anivo Animation (Windows)

echo.
echo ========================================
echo  Anivo Animation - Quick Start (Windows)
echo ========================================
echo.

REM Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

echo === STEP 1: Get Google OAuth Credentials ===
echo 1. Go to https://console.cloud.google.com/
echo 2. Create a new project
echo 3. Enable Google-plus API
echo 4. Create OAuth 2.0 Web Application credentials
echo 5. Add authorized origins:
echo    - http://localhost:3111
echo    - https://goofy0337.github.io
echo 6. Copy your Client ID
echo.
pause

echo === STEP 2: Setup Backend ===
cd backend

if not exist .env (
    echo Creating .env file in backend...
    set /p JWT_SECRET="Enter your JWT_SECRET (generate a random string): "
    set /p GOOGLE_CLIENT_ID="Enter your GOOGLE_CLIENT_ID: "
    
    (
        echo JWT_SECRET=%JWT_SECRET%
        echo GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID%
        echo PORT=4567
    ) > .env
    
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)

echo.
echo Installing backend dependencies...
call npm install

if %errorlevel% equ 0 (
    echo [OK] Backend dependencies installed
) else (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo === STEP 3: Setup Frontend ===
cd ..\frontend

if not exist .env (
    echo Creating .env file in frontend...
    set /p GOOGLE_CLIENT_ID="Enter your GOOGLE_CLIENT_ID (same as backend): "
    
    (
        echo VITE_GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID%
        echo VITE_API_URL=/api
    ) > .env
    
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)

echo.
echo Installing frontend dependencies...
call npm install

if %errorlevel% equ 0 (
    echo [OK] Frontend dependencies installed
) else (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo [OK] Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo 1. Open TWO Command Prompts (Win+R, cmd)
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo Then visit: http://localhost:3111
echo.
echo For detailed setup, see GOOGLE_SIGNIN_SETUP.md
echo.
pause
