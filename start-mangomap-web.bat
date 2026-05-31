@echo off
cd /d "%~dp0"
echo Starting MANGOMAP web server...
echo Working directory: %CD%
where npm.cmd
npm.cmd run web -- --port 8084 --clear
pause
