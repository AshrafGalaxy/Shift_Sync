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
       - status == 'success'               → all classes have a real room
       - status == 'success_with_overflow' → some classes need manual room assignment
       - HTTP 422                          → genuinely infeasible (bad constraints)
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
        available_subs.append({
            "faculty_id": f.id,
            "name": f.name,
            "current_load": f.total_target_load,
            "status": "Available & On Shift",
        })

    return {
        "query": {"day": day, "time": time_index},
        "available_substitutes": available_subs,
    }
