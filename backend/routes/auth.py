from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from connection import get_db
from models import User
from schemas.user import UserRegister, UserLogin, VerifyOTP, UserResponse, Token
from utils.auth import hash_password, verify_password, create_access_token, generate_otp
from utils.email import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate OTP
    otp_code = generate_otp()
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        otp_code=otp_code
    )
    
    db.add(user)
    db.commit()
    
    # Send OTP email
    send_otp_email(user_data.email, otp_code)
    
    return {"message": "Registration successful. Please check your email for OTP."}

@router.post("/verify-otp")
async def verify_otp(otp_data: VerifyOTP, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == otp_data.email).first()
    if not user or user.otp_code != otp_data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user.is_verified = True
    user.otp_code = None
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Email not verified")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}