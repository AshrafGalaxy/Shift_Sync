from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union, Dict, Any

# --- Shared Enumerations / Logic ---

class SubjectType(str):
    THEORY = "Theory"
    LAB = "Lab"
    TUTORIAL = "Tutorial"

# --- Dynamic Custom Rules Engine ---

class CustomRule(BaseModel):
    id: str
    condition_field: str = Field(..., description="e.g. 'subject', 'faculty_id', 'target_group'")
    condition_operator: str = Field(..., description="'EQUALS', 'CONTAINS'")
    condition_value: str = Field(...)
    action_type: str = Field(..., description="e.g. 'RESTRICT_TIME', 'FORCE_ROOM'")
    action_value: Any = Field(..., description="e.g. ['08:00', '09:00'] for morning only restrictions")

# --- College Global Settings ---

class CollegeSettings(BaseModel):
    days_active: List[str] = Field(..., description="e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']")
    time_slots: List[int] = Field(..., description="Array of integer hours e.g. [8, 9, 10... 17]")
    lunch_slot: Dict[str, int] = Field(..., description="Map of day string to integer hour, e.g. {'Monday': 12, 'Tuesday': 13}")
    custom_rules: List[CustomRule] = Field(default_factory=list, description="Dynamic array of IF-THEN conditions")

# --- Specialized Infrastructure Setup ---

class Room(BaseModel):
    id: str
    type: str = Field(..., description="'Classroom', 'Laboratory', 'SeminarHall', etc.")
    capacity: int = Field(..., gt=0)
    tags: List[str] = Field(default_factory=list, description="Array of capabilities e.g. ['Projector', 'Linux_Lab', 'Chemistry']")

class RoomsConfig(BaseModel):
    rooms: List[Room] = Field(..., description="Master list of all available infrastructure with specific tags")

# --- Faculty & Workload Mapping ---

class WorkloadItem(BaseModel):
    id: str = Field(..., description="Unique event ID to trace contiguous blocks easily")
    type: str = Field(..., description="'Theory', 'Lab', or 'Tutorial'")
    subject: str = Field(..., description="Subject code e.g. 'CS301'")
    target_groups: List[str] = Field(..., description="Array of targets (e.g. ['Div_A', 'Div_B'] for merged classes)")
    hours: int = Field(..., gt=0, description="Exact number of weekly hours required for this mapping")
    consecutive_hours: int = Field(1, description="How many hours MUST be mapped side-by-side without interruptions")
    required_tags: List[str] = Field(default_factory=list, description="Array of tags the assigned room MUST possess")
    is_online: bool = Field(default=False, description="If true, bypasses physical room mapping")

    @field_validator("type", mode="before")
    @classmethod
    def normalise_workload_type(cls, v: str) -> str:
        """Accept any casing variant of the 3 canonical types.
        Maps: practical / Practical / PRACTICAL / lab / LAB → 'Lab'
              theory / THEORY → 'Theory'
              tutorial / TUTORIAL → 'Tutorial'
        Raises a clear ValueError for anything else.
        """
        mapping = {
            "theory": "Theory",
            "lab": "Lab",
            "practical": "Lab",   # legacy alias → Lab
            "tutorial": "Tutorial",
        }
        normalised = mapping.get(str(v).strip().lower())
        if normalised is None:
            raise ValueError(
                f"Invalid class type '{v}'. Allowed values: Theory, Lab, Tutorial "
                f"(also accepts: practical as an alias for Lab)."
            )
        return normalised

class BlockedSlot(BaseModel):
    day: str
    time: int

class FacultyConfig(BaseModel):
    id: str
    name: str
    shift: List[int] = Field(..., description="Array of valid integer hours this faculty is allowed to work")
    blocked_slots: List[BlockedSlot] = Field(default_factory=list, description="Handling visiting/part-time absences")
    max_load_hrs: int = Field(..., gt=0, description="The absolute total maximum contracted hours")
    max_continuous_hrs: int = Field(3, gt=0, description="Max continuous teaching hours before fatigue penalty")
    class_teacher_for: Optional[str] = Field(None, description="Division ID if this faculty is a class teacher")
    workload: List[WorkloadItem] = Field(default_factory=list)

    @property
    def total_target_load(self) -> int:
        return sum(item.hours for item in self.workload)

# --- Master Payload ---

class GenerationPayload(BaseModel):
    college_settings: CollegeSettings
    rooms_config: RoomsConfig
    faculty: List[FacultyConfig]
