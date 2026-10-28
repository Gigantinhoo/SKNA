@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv-tts\Scripts\python.exe" (
  echo Execute primeiro INSTALAR-VOZ-LOCAL.bat
  pause
  exit /b 1
)
".venv-tts\Scripts\python.exe" local_tts.py
pause
