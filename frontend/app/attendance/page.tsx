'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Container, Paper, Typography, Box, Button, Card, CardContent, Alert, CircularProgress } from '@mui/material'
import { CameraAlt, Stop, CheckCircle, Cancel, Business } from '@mui/icons-material'

export default function AttendancePage() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(async (blob) => {
        if (!blob) return
        
        const formData = new FormData()
        formData.append('face_image', blob)
        
        try {
          const response = await fetch('http://localhost:8000/employees/detect-face-preview', {
            method: 'POST',
            body: formData
          })
          
          const result = await response.json()
          
          if (result.success && result.face_detected) {
            setFaceDetected(true)
            drawFaceBox(result.bbox)
          } else {
            setFaceDetected(false)
            clearFaceBox()
          }
        } catch (error) {
          console.error('Face detection error:', error)
        }
      }, 'image/jpeg', 0.8)
    }
  }, [])

  const drawFaceBox = (bbox: any) => {
    if (!overlayCanvasRef.current || !videoRef.current) return
    
    const canvas = overlayCanvasRef.current
    const context = canvas.getContext('2d')
    const video = videoRef.current
    
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = '#00ff00'
      context.lineWidth = 3
      context.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)
      
      context.fillStyle = '#00ff00'
      context.font = '16px Arial'
      context.fillText('Face Detected', bbox.x, bbox.y - 10)
    }
  }

  const clearFaceBox = () => {
    if (!overlayCanvasRef.current) return
    const context = overlayCanvasRef.current.getContext('2d')
    if (context) {
      context.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)
    }
  }

  const startCamera = async () => {
    setCameraLoading(true)
    try {
      console.log('Requesting camera access...')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not supported by this browser. Please use Chrome, Firefox, or Safari.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      })
      
      console.log('Camera access granted')
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current?.play().then(() => {
            console.log('Video playing')
            setIsCapturing(true)
            setCameraLoading(false)
          }).catch(err => {
            console.error('Video play error:', err)
            setCameraLoading(false)
          })
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      setCameraLoading(false)
      
      let errorMessage = 'Unable to access camera. '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported by this browser.'
      } else {
        errorMessage += 'Please check camera permissions and try again.'
      }
      
      alert(errorMessage)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
    setCameraLoading(false)
    setFaceDetected(false)
    setResult(null)
  }

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    setLoading(true)
    
    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(async (blob) => {
        if (!blob) return

        const formData = new FormData()
        formData.append('face_image', blob, 'face.jpg')

        try {
          const response = await fetch('http://localhost:8000/employees/recognize-face', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()
          setResult(data)
          
          if (data.success) {
            setTimeout(() => {
              stopCamera()
            }, 3000)
          }
        } catch (error) {
          console.error('Recognition error:', error)
          setResult({
            success: false,
            message: 'Network error. Please try again.'
          })
        }
      }, 'image/jpeg', 0.8)
      
    } catch (error) {
      console.error('Capture error:', error)
      setResult({
        success: false,
        message: 'Failed to capture image. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // Face detection interval with auto-attendance
  useEffect(() => {
    if (isCapturing && !loading && !result) {
      const interval = setInterval(() => {
        detectFace()
        // Auto-capture if face detected
        if (faceDetected) {
          setTimeout(() => {
            captureAndRecognize()
          }, 1000) // Wait 1 second after face detection
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isCapturing, loading, faceDetected, result, detectFace, captureAndRecognize])

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 3, mb: 4 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Business sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h3" component="h1" fontWeight="bold">
              SmartAttend
            </Typography>
          </Box>
          <Typography variant="h6" align="center" sx={{ mt: 1, opacity: 0.9 }}>
            Employee Attendance System
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md">
        <Typography variant="h4" gutterBottom align="center" color="primary.main">
          Mark Your Attendance
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Look at the camera to mark your check-in or check-out
        </Typography>

        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Always render video element but hide when not capturing */}
              <Box sx={{ position: 'relative' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxWidth: 480,
                    height: 'auto',
                    borderRadius: 12,
                    border: '3px solid #1976d2',
                    display: isCapturing ? 'block' : 'none'
                  }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    display: isCapturing ? 'block' : 'none'
                  }}
                />
              </Box>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {!isCapturing && !cameraLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CameraAlt sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom color="primary.main">
                    Ready to mark attendance?
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<CameraAlt />}
                    onClick={startCamera}
                    sx={{ mt: 2, py: 1.5, px: 4, fontSize: '1.1rem' }}
                  >
                    Start Camera
                  </Button>
                </Box>
              ) : cameraLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="primary.main">
                    Starting camera...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', textAlign: 'center' }}>
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color={faceDetected ? 'success.main' : 'text.secondary'}>
                      {faceDetected ? '✓ Face detected - Marking attendance automatically...' : 'Position your face in the camera'}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={stopCamera}
                      startIcon={<Stop />}
                      sx={{ py: 1.5, px: 4 }}
                    >
                      Stop Camera
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {result && (
          <Alert 
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckCircle /> : <Cancel />}
            sx={{ mb: 3, fontSize: '1.1rem' }}
          >
            <Typography variant="h6" gutterBottom>
              {result.message}
            </Typography>
            {result.success && result.employee && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Employee: {result.employee.name} ({result.employee.employee_id})
                </Typography>
                <Typography variant="body1">
                  Action: <strong>{result.employee.action === 'check_in' ? 'Check In' : 'Check Out'}</strong>
                </Typography>
                <Typography variant="body1">
                  Time: <strong>{result.employee.time}</strong>
                </Typography>
                <Typography variant="body1">
                  Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                </Typography>
              </Box>
            )}
          </Alert>
        )}

        <Card sx={{ boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary.main">
              How to use:
            </Typography>
            <Typography variant="body1" component="div">
              <Box component="ul" sx={{ pl: 2 }}>
                <li>Click "Start Camera" to begin</li>
                <li>Position your face clearly in the camera view</li>
                <li>Attendance will be marked automatically when your face is detected</li>
                <li>First recognition of the day = Check In</li>
                <li>Second recognition of the day = Check Out</li>
                <li>Make sure you have good lighting for better recognition</li>
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}