from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from connection import get_db
from models import User
from schemas.user import UserResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/user", tags=["User"])

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user