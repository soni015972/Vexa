@echo off
echo.
echo ==========================================
echo   Vexa - Git Setup Script
echo   Your AI. Your way.
echo ==========================================
echo.

cd /d "c:\cricket project\Vexa"

echo [1/4] Removing old SigmaGPT remote...
git remote remove origin 2>nul
if %errorlevel% == 0 (echo     Done.) else (echo     No remote to remove, continuing...)

echo.
echo [2/4] Staging all Vexa changes...
git add -A
echo     Done.

echo.
echo [3/4] Creating initial Vexa commit...
git commit -m "🚀 Initial commit – Vexa: Your AI. Your way. (Gemini-themed UI)"
echo     Done.

echo.
echo [4/4] Ready to push!
echo.
echo ==========================================
echo  NEXT STEP - Set your GitHub remote:
echo.
echo  Run this command (replace YOUR_USERNAME):
echo.
echo  git remote add origin https://github.com/YOUR_USERNAME/Vexa.git
echo  git branch -M main
echo  git push -u origin main
echo ==========================================
echo.
pause
