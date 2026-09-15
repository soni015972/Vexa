@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo   ✦ Vexa - One-Click Git Commit and GitHub Push ✦
echo ====================================================
echo.

cd /d "c:\cricket project\Vexa"

echo [1/3] Staging all changes...
git add -A
if %errorlevel% neq 0 (
    echo [ERROR] Git add failed. Please make sure Git is installed.
    pause
    exit /b 1
)

echo [2/3] Committing changes as Vexa...
git commit -m "Initial commit: Vexa - Your AI. Your way. (Gemini UI theme)" 2>nul
if %errorlevel% equ 0 (
    echo     Commit created successfully.
) else (
    echo     Changes already committed or nothing new to commit.
)

echo.
echo [3/3] Configure GitHub Remote & Push
echo ----------------------------------------------------
echo Please make sure you created a new repository named: Vexa
echo on your GitHub account (https://github.com/new).
echo.
set /p GH_USER="Enter your GitHub username: "

if "%GH_USER%"=="" (
    echo [ERROR] GitHub username cannot be empty.
    pause
    exit /b 1
)

echo.
echo Configuring remote to: https://github.com/%GH_USER%/Vexa.git
git remote remove origin 2>nul
git remote add origin https://github.com/%GH_USER%/Vexa.git
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo   [SUCCESS] Successfully pushed Vexa to GitHub!
    echo   Repo URL: https://github.com/%GH_USER%/Vexa
    echo ====================================================
) else (
    echo.
    echo [NOTE] If prompted for authentication, log in via GitHub credentials/Personal Access Token.
)

echo.
pause
