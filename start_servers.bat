@echo off
echo ===================================================
echo      ShiftSync - Development Server Launcher       
echo ===================================================
echo.
echo Launching both servers in this terminal window...
echo Press Ctrl+C at any time to stop both servers.
echo.

npx concurrently -n "FastAPI,Next.js" -c "cyan,magenta" "cd backend && .\venv\bin\activate.bat && uvicorn main:app --port 8000 --reload" "cd frontend && npm run dev"
