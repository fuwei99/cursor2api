@echo off
echo Starting Cursor-To-OpenAI service...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if dependencies need to be installed
if not exist "node_modules" (
    echo First run, installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

REM Ensure data directory exists
if not exist "data" mkdir data

REM Set environment variables
set PORT=3010

REM Start the service
echo Service is starting, please wait...
npm start

REM Wait for service to start
echo Waiting for service to start...
timeout /t 3 /nobreak > nul

REM Open login page
echo Opening login page...
start http://localhost:%PORT%/admin/login

echo Service is running. Press any key to stop the service.
pause

REM End service process
echo Stopping service...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%"') do (
    taskkill /F /PID %%a 2>nul
)

echo Service has been stopped.
pause 