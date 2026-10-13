@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 goto nonode
if not exist node_modules goto install
goto run

:install
echo [1/2] Installing dependencies, first run, please wait 2-5 minutes...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
if %errorlevel% neq 0 goto fail

:run
echo [2/2] Starting AI Todo Assistant...
call npm start
if %errorlevel% neq 0 goto fail
goto end

:nonode
echo [ERROR] Node.js not found. Install first: https://nodejs.org/zh-cn/download
pause
exit /b 1

:fail
echo.
echo [ERROR] Something went wrong. Take a screenshot of this window and send it to me.
pause
exit /b 1

:end
pause
