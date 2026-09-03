@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "FF="
for /f "delims=" %%I in ('where firefox 2^>nul') do (
  set "FF=%%I"
  goto :got_firefox
)
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" set "FF=%ProgramFiles%\Mozilla Firefox\firefox.exe"
if not defined FF if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" set "FF=%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe"
:got_firefox
if not defined FF (
  echo Firefox was not found. Install Mozilla Firefox and run this launcher again.
  pause
  exit /b 1
)

set "PROFILE=%LOCALAPPDATA%\aim-offset-kiosk"
if not exist "%PROFILE%" mkdir "%PROFILE%"

start "" py -m http.server 8765 --bind 127.0.0.1

set WAITED=0
:wait_server
py -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/', timeout=1)" >nul 2>&1
if not errorlevel 1 goto :server_ready
set /a WAITED+=1
if %WAITED% geq 20 goto :server_failed
timeout /t 1 /nobreak >nul
goto :wait_server

:server_failed
echo The local demo server did not become ready.
call :kill_listener
pause
exit /b 1

:server_ready
start "" /wait "%FF%" -kiosk -new-instance -no-remote -profile "%PROFILE%" -url "http://127.0.0.1:8765/"
call :kill_listener
exit /b 0

:kill_listener
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":8765" ^| findstr /I "LISTENING"') do (
  taskkill /F /PID %%P >nul 2>&1
)
goto :eof
