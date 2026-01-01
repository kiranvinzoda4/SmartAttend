from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from connection import engine, Base
from routes import auth, user, department, employee, attendance

# Tables will be created via Alembic migrations
# Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartAttend Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(department.router)
app.include_router(employee.router)
app.include_router(attendance.router)

@app.get("/")
async def root():
    return {"message": "SmartAttend Auth API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)