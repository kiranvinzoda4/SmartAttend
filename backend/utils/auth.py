from passlib.context import CryptContext
from jwcrypto import jwt, jwk
from datetime import datetime, timedelta
import random
import string
import os
import json
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from connection import get_db

load_dotenv()

JWT_KEY = os.getenv("JWT_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification failed: {e}")
        return False

def create_access_token(data: dict):
    key = jwk.JWK.from_json(JWT_KEY)
    
    header = {"alg": "HS256"}
    payload = {
        **data,
        "exp": int((datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
    }
    
    token = jwt.JWT(header=header, claims=payload)
    token.make_signed_token(key)
    return token.serialize()

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from models import User
    
    try:
        print(f"Received token: {token[:50]}...")  # Debug log
        print(f"JWT_KEY: {JWT_KEY[:50]}...")  # Debug log
        
        key = jwk.JWK.from_json(JWT_KEY)
        token_obj = jwt.JWT(jwt=token, key=key)
        claims = json.loads(token_obj.claims)
        
        print(f"Claims: {claims}")  # Debug log
        
        email: str = claims.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token - no email")
            
        # Check expiration
        exp = claims.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            raise HTTPException(status_code=401, detail="Token expired")
            
    except Exception as e:
        print(f"Token verification error: {e}")  # Debug log
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user