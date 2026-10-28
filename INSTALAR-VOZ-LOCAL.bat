@echo off
setlocal
cd /d "%~dp0"
echo === Sukuna Live - instalacao da voz local gratuita ===
echo.
py -3.11 --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: instale Python 3.11 de https://www.python.org/downloads/release/python-3119/
  echo Durante a instalacao, marque "Add python.exe to PATH".
  pause
  exit /b 1
)
if not exist ".venv-tts\Scripts\python.exe" py -3.11 -m venv .venv-tts
call ".venv-tts\Scripts\python.exe" -m pip install --upgrade pip
call ".venv-tts\Scripts\python.exe" -m pip install -r requirements-tts.txt
if errorlevel 1 (
  echo.
  echo A instalacao falhou. Confira o erro acima.
  pause
  exit /b 1
)
echo.
echo Instalacao concluida. Agora execute INICIAR-VOZ-LOCAL.bat.
pause
