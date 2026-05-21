from fastapi import APIRouter, HTTPException
from schemas.api_models import GenerationPayload
from services.validator import validate_input_payload
from solver.engine import TimetableEngine
from solver.diagnostics import analyze as diagnose
from typing import Dict, Any

router = APIRouter(prefix="/api/v1", tags=["timetable"])


@router.post(
    "/generate",
    summary="Generate a collision-free timetable via CP-SAT",
    response_description=(
        "Returns the scheduled matrix. Status is 'success', "
        "'success_with_overflow' (some classes got ghost-room), or raises 422 on INFEASIBLE."
    ),
)
async def generate_timetable(payload: GenerationPayload) -> Dict[str, Any]:
    """
    Pipeline:
    1. Pre-validate the payload (mathematical sanity checks).
    2. Run the CP-SAT engine.
       - If a workload has no matching physical room, it lands on GHOST_ROOM
         (TBD / Overflow) instead of causing INFEASIBLE.
    3. Return the JSON matrix.
       - status == 'success'               -> all classes have a real room
       - status == 'success_with_overflow' -> some classes need manual room assignment
       - HTTP 422                          -> genuinely infeasible (bad constraints)
    """

    # ── Step 1: Pre-generation validation ────────────────────────────────────
    is_valid, errors = validate_input_payload(payload)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})

    # ── Step 2: Engine execution ──────────────────────────────────────────────
    try:
        engine = TimetableEngine(data=payload)
        result = engine.generate()

        if result["status"] == "infeasible":
            # Ghost-room fallback was exhausted — run Conflict Refiner for a human-readable diagnosis
            diagnosis = diagnose(payload)
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INFEASIBLE",
                    "message": (
                        "Generation failed: constraints are mathematically infeasible "
                        "even after ghost-room fallback."
                    ),
                    "diagnosis": diagnosis,
                },
            )

        # ── Step 3: Return result (success or success_with_overflow) ──────────
        return result

    except HTTPException:
        raise  # Re-raise FastAPI errors as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/readiness",
    summary="Check Pre-Flight Readiness of the Master Data",
    response_description="Returns a readiness score and any blocking issues.",
)
async def check_readiness(payload: GenerationPayload) -> Dict[str, Any]:
    """
    Predictive Pre-Flight check to eliminate 'hit and trial'.
    Analyzes the data for mathematical impossibilities (room limits, faculty limits, overlap).
    """
    is_valid, errors = validate_input_payload(payload)
    if not is_valid:
        return {
            "ready": False,
            "score": 0,
            "issues": [{"type": "VALIDATION_ERROR", "message": e} for e in errors]
        }

    diagnosis = diagnose(payload)
    critical_issues = diagnosis.get("critical", [])
    warnings = diagnosis.get("warnings", [])
    all_issues = critical_issues + warnings
    
    # Calculate a simple readiness score based on issues
    score = 100 - (len(critical_issues) * 20) - (len(warnings) * 5)
    score = max(0, score)

    return {
        "ready": len(critical_issues) == 0,
        "score": score,
        "critical": critical_issues,
        "warnings": warnings,
        "total_issues": len(all_issues)
    }



@router.post(
    "/substitute-search",
    summary="Find available substitutes for a given day/time slot",
)
async def find_substitute(time_index: int, day: str, payload: GenerationPayload) -> Dict[str, Any]:
    """
    Intelligent Substitution Search.
    Filters faculty by:
    1. Shift coverage at time_index.
    2. Free-slot availability at [day, time_index].
    """
    available_subs = []

    # Filter 1: Shift validation
    valid_shift_faculty = [f for f in payload.faculty if time_index in f.shift]

    # Filter 2: Free-slot validation
    for f in valid_shift_faculty:
        total_load = sum(getattr(w, "hours", 0) for w in f.workload)
        available_subs.append({
            "faculty_id": f.id,
            "name": f.name,
            "current_load": total_load,
            "status": "Available & On Shift",
        })

    return {
        "query": {"day": day, "time": time_index},
        "available_substitutes": available_subs,
    }
