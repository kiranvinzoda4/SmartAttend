from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time

class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    employee_code: str
    department_name: str
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    created_at: datetime

    class Config:
        from_attributes = True