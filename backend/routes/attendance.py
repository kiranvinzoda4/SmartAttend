from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from connection import get_db
from models import Attendance, Employee, Department
from schemas.attendance import AttendanceResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department)
    )
    
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    
    attendances = query.order_by(Attendance.date.desc(), Attendance.employee_id).all()
    
    result = []
    for att in attendances:
        att_data = AttendanceResponse(
            id=att.id,
            employee_id=att.employee_id,
            employee_name=f"{att.employee.first_name} {att.employee.last_name}",
            employee_code=att.employee.employee_id,
            department_name=att.employee.department.name,
            date=att.date,
            check_in=att.check_in,
            check_out=att.check_out,
            created_at=att.created_at
        )
        result.append(att_data)
    
    return result

@router.get("/employee/{employee_id}", response_model=List[AttendanceResponse])
async def get_employee_attendance(
    employee_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department)
    ).filter(Attendance.employee_id == employee_id)
    
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    
    attendances = query.order_by(Attendance.date.desc()).all()
    
    result = []
    for att in attendances:
        att_data = AttendanceResponse(
            id=att.id,
            employee_id=att.employee_id,
            employee_name=f"{att.employee.first_name} {att.employee.last_name}",
            employee_code=att.employee.employee_id,
            department_name=att.employee.department.name,
            date=att.date,
            check_in=att.check_in,
            check_out=att.check_out,
            created_at=att.created_at
        )
        result.append(att_data)
    
    return result