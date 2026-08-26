@echo off
start "" py -m http.server 8765
timeout /t 1 /nobreak >nul
start "" /wait firefox -kiosk -fullscreen http://localhost:8765/
taskkill /F /IM python.exe >nul 2>&1