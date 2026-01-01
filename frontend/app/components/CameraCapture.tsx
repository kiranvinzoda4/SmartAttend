'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material'
import { CameraAlt, Refresh, Check } from '@mui/icons-material'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  onCapture: (imageBlob: Blob) => void
  title: string
}

export default function CameraCapture({ open, onClose, onCapture, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceBox, setFaceBox] = useState<any>(null)

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
            setFaceBox(result.bbox)
            drawFaceBox(result.bbox)
          } else {
            setFaceDetected(false)
            setFaceBox(null)
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
      
      // Add text
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

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (err) {
      setError('Camera access denied or not available')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageDataUrl)
      }
    }
  }, [])

  const confirmCapture = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob)
          handleClose()
        }
      }, 'image/jpeg', 0.8)
    }
  }, [onCapture])

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setError(null)
    setFaceDetected(false)
    setFaceBox(null)
    onClose()
  }

  useEffect(() => {
    if (open) {
      startCamera()
    }
    return () => stopCamera()
  }, [open])

  // Face detection interval
  useEffect(() => {
    if (stream && !capturedImage) {
      const interval = setInterval(detectFace, 1000) // Detect every second
      return () => clearInterval(interval)
    }
  }, [stream, capturedImage, detectFace])

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          {error ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography color="error" gutterBottom>{error}</Typography>
              <Button variant="outlined" onClick={startCamera}>Try Again</Button>
            </Box>
          ) : !capturedImage ? (
            <>
              <Box sx={{ 
                position: 'relative',
                width: 400, 
                height: 300, 
                backgroundColor: '#000', 
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={400}
                  height={300}
                  style={{ objectFit: 'cover' }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color={faceDetected ? 'success.main' : 'text.secondary'}>
                  {faceDetected ? '✓ Face detected - Ready to capture' : 'Position your face in the camera'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<CameraAlt />}
                onClick={capturePhoto}
                disabled={!stream || !faceDetected}
                color={faceDetected ? 'success' : 'primary'}
              >
                Capture Photo
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ width: 400, height: 300, borderRadius: 1, overflow: 'hidden' }}>
                <img
                  src={capturedImage}
                  alt="Captured"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" startIcon={<Refresh />} onClick={retakePhoto}>
                  Retake
                </Button>
                <Button variant="contained" startIcon={<Check />} onClick={confirmCapture}>
                  Use Photo
                </Button>
              </Box>
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}