from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import os
import cv2
import numpy as np
from datetime import datetime, date, time
from connection import get_db
from models import Employee, Department, Attendance
from schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from utils.auth import get_current_user
from services.face_recognition_service import FaceRecognitionService

router = APIRouter(prefix="/employees", tags=["Employees"])
face_service = FaceRecognitionService()

@router.post("/", response_model=EmployeeResponse)
async def create_employee(
    employee_id: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    department_id: int = Form(...),
    position: Optional[str] = Form(None),
    hire_date: str = Form(...),
    is_active: bool = Form(True),
    face_left: Optional[UploadFile] = File(None),
    face_center: Optional[UploadFile] = File(None),
    face_right: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        from datetime import datetime
        print(f"Creating employee: {employee_id}, {first_name} {last_name}")
        
        # Check if employee_id exists
        existing_emp_id = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if existing_emp_id:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
        
        # Check if email exists
        existing_email = db.query(Employee).filter(Employee.email == email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Check if department exists
        department = db.query(Department).filter(Department.id == department_id).first()
        if not department:
            raise HTTPException(status_code=400, detail="Department not found")
        
        # Handle face images
        face_image_paths = {}
        embedding_id = None
        
        if face_left or face_center or face_right:
            print("Processing face images...")
            # Save face images
            images = {}
            if face_left:
                images['left'] = await face_left.read()
                print(f"Left image size: {len(images['left'])} bytes")
            if face_center:
                images['center'] = await face_center.read()
                print(f"Center image size: {len(images['center'])} bytes")
            if face_right:
                images['right'] = await face_right.read()
                print(f"Right image size: {len(images['right'])} bytes")
            
            try:
                # Use InsightFace directly for consistent processing
                embeddings_data = {}
                for position, image_data in images.items():
                    # Convert to OpenCV format
                    nparr = np.frombuffer(image_data, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
                    if img is not None:
                        # Extract embedding using InsightFace
                        embedding, bbox = face_service.extract_face_embedding_from_image(img)
                        
                        if embedding is not None:
                            embeddings_data[position] = {
                                'embedding': embedding,
                                'bbox': bbox,
                                'image_data': image_data
                            }
                            print(f"Extracted {position} face embedding: {bbox}")
                        else:
                            print(f"No face detected in {position} image")
                
                if embeddings_data:
                    # Save original images
                    images_to_save = {pos: data['image_data'] for pos, data in embeddings_data.items()}
                    saved_image_paths = face_service.save_face_images(employee_id, images_to_save)
                    print(f"Saved image paths: {saved_image_paths}")
                    
                    # Create embeddings directly from extracted data
                    embeddings = [data['embedding'] for data in embeddings_data.values()]
                    
                    # Normalize each embedding
                    normalized_embeddings = []
                    for emb in embeddings:
                        norm = np.linalg.norm(emb)
                        if norm > 0:
                            normalized_embeddings.append(emb / norm)
                        else:
                            normalized_embeddings.append(emb)
                    
                    # Average normalized embeddings
                    avg_embedding = np.mean(normalized_embeddings, axis=0)
                    
                    # Final normalization
                    final_embedding = avg_embedding / np.linalg.norm(avg_embedding)
                    
                    # Generate unique ID and store in FAISS
                    import uuid
                    embedding_id = str(uuid.uuid4())
                    current_index = face_service.index.ntotal
                    face_service.index.add(final_embedding.astype(np.float32).reshape(1, -1))
                    
                    face_service.employee_mappings[current_index] = {
                        "employee_id": employee_id,
                        "embedding_id": embedding_id,
                        "orientations_count": {pos: 1 for pos in embeddings_data.keys()}
                    }
                    
                    face_service.save_index()
                    print(f"Created embedding ID: {embedding_id}")
                    
                    # Store paths in database format
                    face_image_paths = {
                        'face_image_left': saved_image_paths.get('left'),
                        'face_image_center': saved_image_paths.get('center'),
                        'face_image_right': saved_image_paths.get('right')
                    }
                else:
                    print("No faces detected in any images")
                    
            except Exception as face_error:
                print(f"Face processing error: {face_error}")
                # Continue without face data if face processing fails
                pass
        
        # Create employee
        db_employee = Employee(
            employee_id=employee_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            department_id=department_id,
            position=position,
            hire_date=datetime.strptime(hire_date, "%Y-%m-%d").date(),
            is_active=is_active,
            face_image_left=face_image_paths.get('face_image_left'),
            face_image_center=face_image_paths.get('face_image_center'),
            face_image_right=face_image_paths.get('face_image_right'),
            face_embedding_id=embedding_id
        )
        
        print("Adding employee to database...")
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        print(f"Employee created successfully with ID: {db_employee.id}")
        
        # Add department name to response
        response = EmployeeResponse.from_orm(db_employee)
        response.department_name = department.name
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating employee: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employees = db.query(Employee).options(joinedload(Employee.department)).all()
    result = []
    for emp in employees:
        emp_data = EmployeeResponse.from_orm(emp)
        emp_data.department_name = emp.department.name if emp.department else None
        result.append(emp_data)
    return result

@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = db.query(Employee).options(joinedload(Employee.department)).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    response = EmployeeResponse.from_orm(employee)
    response.department_name = employee.department.name if employee.department else None
    return response

@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_update.dict(exclude_unset=True)
    
    # Check unique constraints
    if "employee_id" in update_data:
        existing = db.query(Employee).filter(
            Employee.employee_id == update_data["employee_id"],
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    if "email" in update_data:
        existing = db.query(Employee).filter(
            Employee.email == update_data["email"],
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    if "department_id" in update_data:
        department = db.query(Department).filter(Department.id == update_data["department_id"]).first()
        if not department:
            raise HTTPException(status_code=400, detail="Department not found")
    
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    db.commit()
    db.refresh(employee)
    
    # Get updated employee with department
    employee = db.query(Employee).options(joinedload(Employee.department)).filter(Employee.id == employee_id).first()
    response = EmployeeResponse.from_orm(employee)
    response.department_name = employee.department.name if employee.department else None
    return response

@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Clean up face data
    face_service.delete_face_embedding(employee.employee_id)
    face_service.delete_face_images(employee.employee_id)
    
    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}

@router.get("/{employee_id}/face/{position}")
async def get_employee_face_image(
    employee_id: str,
    position: str
):
    if position not in ['left', 'center', 'right']:
        raise HTTPException(status_code=400, detail="Invalid position")
    
    image_path = f"./employee_faces/{employee_id}/{position}.jpg"
    print(f"Looking for image at: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Image not found at: {image_path}")
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(image_path, media_type="image/jpeg")

@router.post("/detect-face-preview")
async def detect_face_preview(
    face_image: UploadFile = File(...)
):
    try:
        # Read the uploaded image
        image_data = await face_image.read()
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Detect face using InsightFace
        embedding, bbox = face_service.extract_face_embedding_from_image(image)
        
        if bbox is None:
            return {"success": False, "message": "No face detected"}
        
        x, y, w, h = bbox
        
        return {
            "success": True,
            "face_detected": True,
            "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
            "message": "Face detected successfully"
        }
        
    except Exception as e:
        print(f"Face detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

@router.post("/recognize-face")
async def recognize_face_for_attendance(
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Read the uploaded image
        image_data = await face_image.read()
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Use InsightFace directly for both detection and embedding
        embedding, bbox = face_service.extract_face_embedding_from_image(image)
        
        if embedding is None:
            return {"success": False, "message": "No face detected in image"}
        
        print(f"Face detected at: {bbox}")
        
        # Normalize the query embedding
        normalized_embedding = embedding / np.linalg.norm(embedding)
        
        # Search for matching face
        results = face_service.search_face(normalized_embedding, k=3)
        
        print(f"Total embeddings in index: {face_service.index.ntotal}")
        print(f"Search results count: {len(results)}")
        
        if not results:
            return {"success": False, "message": "Face not recognized - no employees registered with face data"}
        
        # Check if similarity is high enough (threshold)
        best_match = results[0]
        print(f"Best match confidence: {best_match['similarity']:.3f}")
        print(f"Employee ID: {best_match['employee_id']}")
        print(f"All results: {[(r['employee_id'], r['similarity']) for r in results[:3]]}")
        
        if best_match["similarity"] < 0.7:  # Proper threshold for cosine similarity
            return {
                "success": False, 
                "message": f"Face not recognized with sufficient confidence. Got {best_match['similarity']:.1%}, need 70%+. Try better lighting or face position."
            }
        
        # Get employee details
        employee = db.query(Employee).filter(Employee.employee_id == best_match["employee_id"]).first()
        if not employee:
            return {"success": False, "message": "Employee not found"}
        
        # Check if already marked attendance today
        today = date.today()
        existing_attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == today
        ).first()
        
        current_time = datetime.now().time()
        
        if existing_attendance:
            if existing_attendance.check_out is None:
                # Mark check-out
                existing_attendance.check_out = current_time
                db.commit()
                return {
                    "success": True,
                    "message": f"Check-out successful for {employee.first_name} {employee.last_name}",
                    "employee": {
                        "id": employee.id,
                        "name": f"{employee.first_name} {employee.last_name}",
                        "employee_id": employee.employee_id,
                        "action": "check_out",
                        "time": current_time.strftime("%H:%M:%S")
                    },
                    "confidence": best_match["similarity"]
                }
            else:
                return {
                    "success": False,
                    "message": f"Attendance already completed for {employee.first_name} {employee.last_name} today"
                }
        else:
            # Mark check-in
            new_attendance = Attendance(
                employee_id=employee.id,
                date=today,
                check_in=current_time
            )
            db.add(new_attendance)
            db.commit()
            
            return {
                "success": True,
                "message": f"Check-in successful for {employee.first_name} {employee.last_name}",
                "employee": {
                    "id": employee.id,
                    "name": f"{employee.first_name} {employee.last_name}",
                    "employee_id": employee.employee_id,
                    "action": "check_in",
                    "time": current_time.strftime("%H:%M:%S")
                },
                "confidence": best_match["similarity"]
            }
            
    except Exception as e:
        print(f"Face recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Face recognition failed: {str(e)}")