from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as timetable_router

import os

app = FastAPI(
    title="ShiftSync SATIS API",
    description="Intelligent CP-SAT Backend for Timetable Generation",
    version="1.0.0"
)

# Configure CORS — set ALLOWED_ORIGIN env var in production
_allowed_origin = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(timetable_router)

@app.get("/")
def read_root():
    return {
        "engine": "ShiftSync Core", 
        "status": "Online",
        "solver": "Google OR-Tools CP-SAT"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
