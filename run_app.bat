@echo off
setlocal
title UniCampus LAF Launcher
echo ===================================================
echo     UniCampus Lost and Found System Launcher
echo ===================================================
echo.

:: 1. Locate repository root safely
set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"

if not exist "%REPO_ROOT%\backend\app\main.py" (
    if exist "%REPO_ROOT%\..\unicampus_laf\backend\app\main.py" (
        set "REPO_ROOT=%REPO_ROOT%\..\unicampus_laf"
    ) else (
        echo [ERROR] Could not locate the UniCampus repository root folder.
        echo Looked in:
        echo   - %~dp0
        echo   - %~dp0..\unicampus_laf\
        echo.
        pause
        exit /b 1
    )
)

echo Found repository at: %REPO_ROOT%
echo.

:: 2. Check Python executable
set "PYTHON_EXE="
if exist "%REPO_ROOT%\backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=.\.venv\Scripts\python.exe"
    echo [OK] Using virtual environment Python.
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_EXE=python"
        echo [OK] Using system Python.
    ) else (
        echo [ERROR] Python not found in backend\.venv or system PATH.
        pause
        exit /b 1
    )
)

:: 3. Check / Start PostgreSQL Database
echo.
echo [1/4] Checking database connectivity...
"%REPO_ROOT%\backend\.venv\Scripts\python.exe" -c "import socket; s = socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 5432)); s.close()" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is active on port 5432.
) else (
    echo [NOTICE] PostgreSQL not responding on port 5432.
    echo Attempting to start PostgreSQL via Docker...
    where docker >nul 2>nul
    if %errorlevel% equ 0 (
        cd /d "%REPO_ROOT%"
        docker compose up -d db
        timeout /t 3 /nobreak >nul 2>nul || ping 127.0.0.1 -n 4 >nul
    ) else (
        echo [WARNING] Docker not found on PATH. Ensure PostgreSQL is running.
    )
)

:: 4. Clean up any stale processes on ports 8000 and 5173
echo.
echo [2/4] Verifying network ports 8000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
echo [OK] Ports 8000 and 5173 verified available.

:: 5. Launch Backend
echo.
echo [3/4] Starting FastAPI Backend on port 8000...
start "UniCampus Backend (FastAPI)" /d "%REPO_ROOT%\backend" cmd /k "%PYTHON_EXE% -m uvicorn app.main:app --reload --port 8000"

:: 6. Launch Frontend
echo.
echo [4/4] Starting React + Vite Frontend on port 5173...
if not exist "%REPO_ROOT%\frontend\node_modules" (
    echo Installing frontend dependencies [first-time setup]...
    cd /d "%REPO_ROOT%\frontend"
    call npm.cmd install
)
start "UniCampus Frontend (React)" /d "%REPO_ROOT%\frontend" cmd /k npm.cmd run dev

:: 7. Open Browser
echo.
echo Launching browser in 3 seconds...
timeout /t 3 /nobreak >nul 2>nul || ping 127.0.0.1 -n 4 >nul
start http://localhost:5173/

echo.
echo ===================================================
echo   System running cleanly!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ===================================================
echo.
echo Keep this window open or minimize. Close individual windows to stop services.
pause
