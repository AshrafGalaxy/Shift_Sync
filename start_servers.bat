@echo off
echo ===================================================
echo      ShiftSync - Development Server Launcher       
echo ===================================================
echo.

REM ── Check if a production build exists ──────────────────────────────────────
if exist "frontend\.next\BUILD_ID" (
    echo [Next.js] Production build found - starting in FAST mode (next start)
    set NEXTJS_CMD=cd frontend && npm run start
) else (
    echo [Next.js] No build found - running next build first (one time, ~60s)...
    set NEXTJS_CMD=cd frontend && npm run build && npm run start
)

echo [FastAPI] Starting Python solver engine on port 8000...
echo [Next.js] Starting frontend on port 3000...
echo.
echo Press Ctrl+C at any time to stop both servers.
echo.

npx concurrently -n "FastAPI,Next.js" -c "cyan,magenta" "cd backend && .\venv\Scripts\activate.bat && python -m uvicorn main:app --port 8000 --reload" "%NEXTJS_CMD%"
