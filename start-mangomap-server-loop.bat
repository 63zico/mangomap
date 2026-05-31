@echo off
cd /d "%~dp0"
set PORT=4173
title MANGOMAP Local Server

echo MANGOMAP local server
echo URL: http://127.0.0.1:4173/
echo.
echo Keep this window open while testing.
echo If the server exits, it will restart automatically.
echo Logs: %CD%\mangomap-server.log
echo.

:loop
echo [%date% %time%] starting server on port %PORT% >> mangomap-server.log
"C:\Program Files\nodejs\node.exe" scripts\serveWeb.mjs >> mangomap-server.log 2>&1
echo [%date% %time%] server exited with code %ERRORLEVEL% >> mangomap-server.log
echo Server stopped. Restarting in 2 seconds...
timeout /t 2 /nobreak >nul
goto loop
