@echo off
echo ===================================================
echo      ShiftSync - Development Server Launcher
echo      Python 3.11 + OR-Tools 9.11 (Stable)
echo ===================================================
echo.
echo Press Ctrl+C at any time to stop both servers.
echo.

npx concurrently -n "FastAPI,Next.js" -c "cyan,magenta" ^
  "cd backend && ..\backend\venv311\Scripts\python.exe -m uvicorn main:app --port 8000 --reload" ^
  "cd frontend && npm run dev"
