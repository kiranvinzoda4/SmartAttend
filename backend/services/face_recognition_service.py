import cv2
import numpy as np
import os
import faiss
import pickle
from typing import List, Optional, Dict
import uuid
import insightface
from insightface.app import FaceAnalysis

class FaceRecognitionService:
    def __init__(self):
        # Initialize InsightFace with RetinaFace detector
        self.app = FaceAnalysis(providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Initialize FAISS index
        self.embedding_dim = 512  # InsightFace embedding dimension
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.employee_mappings = {}  # Maps FAISS index to employee_id
        
        # Load existing index if available
        self.load_index()
        
    def extract_face_embedding_from_image(self, image):
        """Extract face embedding directly using InsightFace only"""
        # Use InsightFace for detection and embedding
        faces = self.app.get(image)
        
        if not faces:
            return None, None
        
        # Get the largest face
        face = max(faces, key=lambda x: x.bbox[2] * x.bbox[3])
        
        # Get bounding box
        x1, y1, x2, y2 = face.bbox.astype(int)
        bbox = (x1, y1, x2-x1, y2-y1)  # Convert to x,y,w,h format
        
        return face.embedding, bbox
        """Detect face using multiple methods for better profile detection"""
        # Method 1: Try OpenCV frontal face detector
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Method 2: Try profile face detector if no frontal face found
        if len(faces) == 0:
            profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
            faces = profile_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Method 3: Use InsightFace as fallback
        if len(faces) == 0:
            try:
                insight_faces = self.app.get(image)
                if insight_faces:
                    # Convert InsightFace bbox to OpenCV format
                    face = insight_faces[0]
                    x, y, x2, y2 = face.bbox.astype(int)
                    w, h = x2 - x, y2 - y
                    faces = [(x, y, w, h)]
            except:
                pass
        
        if len(faces) == 0:
            return None, None
        
        # Get the largest face
        largest_face = max(faces, key=lambda x: x[2] * x[3])
        x, y, w, h = largest_face
        
        # Add padding around face
        padding = int(0.2 * min(w, h))
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(image.shape[1] - x, w + 2 * padding)
        h = min(image.shape[0] - y, h + 2 * padding)
        
        # Crop face
        face_crop = image[y:y+h, x:x+w]
        
        # Resize to standard size
        face_crop = cv2.resize(face_crop, (224, 224))
        
        return face_crop, (x, y, w, h)
        
    def enhance_image(self, image):
        """Enhance image quality using OpenCV"""
        # Convert to LAB color space for better processing
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        # Merge channels and convert back to BGR
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Apply bilateral filter for noise reduction while preserving edges
        enhanced = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Sharpen the image
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        enhanced = cv2.filter2D(enhanced, -1, kernel)
        
        return enhanced
        
    def detect_face_orientation(self, bbox, landmarks):
        """Detect face orientation based on facial landmarks"""
        # Get key points
        left_eye = landmarks[0]  # Left eye
        right_eye = landmarks[1]  # Right eye
        nose = landmarks[2]      # Nose tip
        
        # Calculate eye center
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        
        # Calculate nose offset from eye center
        nose_offset = nose[0] - eye_center_x
        
        # Determine orientation based on nose position relative to eyes
        if nose_offset < -15:
            return "right"  # Face turned right (nose appears left of center)
        elif nose_offset > 15:
            return "left"   # Face turned left (nose appears right of center)
        else:
            return "center" # Face facing forward
        
    def create_face_embeddings(self, employee_id: str, image_paths: Dict[str, str]) -> Optional[str]:
        """Create face embeddings for left, right, center images using InsightFace"""
        embeddings = []
        orientations = {"left": [], "center": [], "right": []}
        
        for orientation, image_path in image_paths.items():
            if not os.path.exists(image_path):
                continue
                
            try:
                # Load and enhance image
                image = cv2.imread(image_path)
                if image is None:
                    continue
                    
                enhanced_image = self.enhance_image(image)
                
                # Detect faces using InsightFace (includes RetinaFace)
                faces = self.app.get(enhanced_image)
                
                if faces:
                    # Get the largest/most confident face
                    face = max(faces, key=lambda x: x.bbox[2] * x.bbox[3])  # width * height
                    
                    # Get embedding
                    embedding = face.embedding
                    embeddings.append(embedding)
                    orientations[orientation].append(embedding)
                    
                    print(f"Processed {orientation} face for employee {employee_id}")
                        
            except Exception as e:
                print(f"Error processing {orientation} image {image_path}: {e}")
                continue
        
        if not embeddings:
            print(f"No valid face embeddings created for employee {employee_id}")
            return None
            
        # Create combined embedding (average of all orientations)
        avg_embedding = np.mean(embeddings, axis=0).astype(np.float32)
        
        # Generate unique ID for this employee's face data
        embedding_id = str(uuid.uuid4())
        
        # Add to FAISS index
        current_index = self.index.ntotal
        self.index.add(avg_embedding.reshape(1, -1))
        
        # Store mapping
        self.employee_mappings[current_index] = {
            "employee_id": employee_id,
            "embedding_id": embedding_id,
            "orientations_count": {
                "left": len(orientations["left"]),
                "center": len(orientations["center"]), 
                "right": len(orientations["right"])
            }
        }
        
        # Save index
        self.save_index()
        
        print(f"Created embeddings for employee {employee_id} with {len(embeddings)} faces")
        return embedding_id
    
    def delete_face_embedding(self, employee_id: str):
        """Delete face embedding from FAISS index"""
        try:
            # Find the index for this employee
            index_to_remove = None
            for idx, mapping in self.employee_mappings.items():
                if mapping["employee_id"] == employee_id:
                    index_to_remove = idx
                    break
            
            if index_to_remove is not None:
                # Remove from mappings
                del self.employee_mappings[index_to_remove]
                
                # Rebuild FAISS index without this embedding
                self.rebuild_index()
                
                print(f"Deleted face embedding for employee {employee_id}")
        except Exception as e:
            print(f"Error deleting face embedding: {e}")
    
    def rebuild_index(self):
        """Rebuild FAISS index after deletion"""
        # Create new index
        new_index = faiss.IndexFlatL2(self.embedding_dim)
        new_mappings = {}
        
        # Re-add all remaining embeddings
        for old_idx, mapping in self.employee_mappings.items():
            if old_idx < self.index.ntotal:
                # Get the embedding
                embedding = self.index.reconstruct(old_idx)
                
                # Add to new index
                new_idx = new_index.ntotal
                new_index.add(embedding.reshape(1, -1))
                
                # Update mapping
                new_mappings[new_idx] = mapping
        
        # Replace old index and mappings
        self.index = new_index
        self.employee_mappings = new_mappings
        
        # Save updated index
        self.save_index()
    
    def save_face_images(self, employee_id: str, images: Dict[str, bytes]) -> Dict[str, str]:
        """Save face images to secure local storage"""
        # Create employee face directory
        face_dir = f"./employee_faces/{employee_id}"
        os.makedirs(face_dir, exist_ok=True)
        
        saved_paths = {}
        
        for position, image_data in images.items():
            if image_data:
                filename = f"{position}.jpg"
                file_path = os.path.join(face_dir, filename)
                
                # Save image
                with open(file_path, "wb") as f:
                    f.write(image_data)
                
                saved_paths[position] = file_path
        
        return saved_paths
    
    def delete_face_images(self, employee_id: str):
        """Delete employee face images"""
        face_dir = f"./employee_faces/{employee_id}"
        if os.path.exists(face_dir):
            for file in os.listdir(face_dir):
                os.remove(os.path.join(face_dir, file))
            os.rmdir(face_dir)
    
    def save_index(self):
        """Save FAISS index and mappings to disk"""
        os.makedirs("./face_index", exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, "./face_index/face_embeddings.index")
        
        # Save mappings
        with open("./face_index/employee_mappings.pkl", "wb") as f:
            pickle.dump(self.employee_mappings, f)
    
    def load_index(self):
        """Load FAISS index and mappings from disk"""
        try:
            if os.path.exists("./face_index/face_embeddings.index"):
                self.index = faiss.read_index("./face_index/face_embeddings.index")
                
            if os.path.exists("./face_index/employee_mappings.pkl"):
                with open("./face_index/employee_mappings.pkl", "rb") as f:
                    self.employee_mappings = pickle.load(f)
                    
            print(f"Loaded FAISS index with {self.index.ntotal} embeddings")
        except Exception as e:
            print(f"Error loading index: {e}")
            # Initialize empty index if loading fails
            self.index = faiss.IndexFlatL2(self.embedding_dim)
            self.employee_mappings = {}
    
    def search_face(self, query_embedding: np.ndarray, k: int = 1) -> List[Dict]:
        """Search for similar faces using cosine similarity"""
        if self.index.ntotal == 0:
            return []
        
        # Normalize query embedding
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        
        # Search in FAISS (using L2 distance)
        distances, indices = self.index.search(query_norm.reshape(1, -1), k)
        
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx in self.employee_mappings:
                # Convert L2 distance to cosine similarity
                # For normalized vectors: cosine_sim = 1 - (L2_dist^2 / 2)
                cosine_similarity = 1 - (distance * distance / 2)
                cosine_similarity = max(0, min(1, cosine_similarity))  # Clamp to [0,1]
                
                result = self.employee_mappings[idx].copy()
                result["distance"] = float(distance)
                result["similarity"] = float(cosine_similarity)
                results.append(result)
        
        return results