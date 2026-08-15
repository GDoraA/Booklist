@echo off
setlocal

cd /d "%~dp0"
set "BOOKLIST_PORT=8765"
set "BOOKLIST_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if not exist "%BOOKLIST_PYTHON%" (
    where python.exe >nul 2>nul
    if errorlevel 1 (
        echo Nem talalhato Python a gepen.
        echo Inditsd az alkalmazast a Codexbol, vagy telepits Python 3-at.
        pause
        exit /b 1
    )
    set "BOOKLIST_PYTHON=python.exe"
)

echo Booklist inditasa: http://127.0.0.1:%BOOKLIST_PORT%/
start "Booklist szerver - bezarassal leall" /min "%BOOKLIST_PYTHON%" -m http.server %BOOKLIST_PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul

netstat -ano | findstr /r /c:":%BOOKLIST_PORT% .*LISTENING" >nul
if errorlevel 1 (
    echo.
    echo A szerver nem indult el. Lehet, hogy a %BOOKLIST_PORT%-os port mar hasznalatban van.
    pause
    exit /b 1
)

start "" "http://127.0.0.1:%BOOKLIST_PORT%/"
echo A szerver kulon, kismeretu ablakban fut. Annak bezarasaval allithatod le.
timeout /t 4 /nobreak >nul
