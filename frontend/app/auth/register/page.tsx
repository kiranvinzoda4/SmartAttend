'use client'
import { useState } from 'react'
import { Container, Paper, Typography, TextField, Button, Box, Alert, InputAdornment, IconButton, Stepper, Step, StepLabel, Link } from '@mui/material'
import { Email, Person, Lock, Visibility, VisibilityOff, PersonAdd, VerifiedUser } from '@mui/icons-material'
import { apiPost } from '@/lib/api'
import NextLink from 'next/link'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: ''
  })
  const [showOTP, setShowOTP] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const steps = ['Create Account', 'Verify Email']

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await apiPost('/auth/register', formData)
      setShowOTP(true)
      setSuccess('Verification code sent to your email!')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await apiPost('/auth/verify-otp', { email: formData.email, otp_code: otpCode })
      setSuccess('Account verified successfully! Redirecting to login...')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    } catch (error: any) {
      setError(error.response?.data?.detail || 'OTP verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Paper 
          elevation={24} 
          sx={{ 
            p: 6,
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            bgcolor: 'rgba(255,255,255,0.95)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {!showOTP ? (
              <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            ) : (
              <VerifiedUser sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            )}
            <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
              {!showOTP ? 'Create Account' : 'Verify Email'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {!showOTP ? 'Join us to start analyzing your files with AI' : 'Enter the verification code sent to your email'}
            </Typography>
          </Box>

          <Stepper activeStep={showOTP ? 1 : 0} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          {!showOTP ? (
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                fullWidth
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 4, 
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerifyOTP}>
              <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                We've sent a verification code to <strong>{formData.email}</strong>
              </Typography>
              <TextField
                fullWidth
                label="Verification Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                margin="normal"
                required
                inputProps={{ 
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' },
                  maxLength: 6
                }}
              />
              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 4, 
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </Box>
          )}
          
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link 
                component={NextLink} 
                href="/auth/login"
                sx={{ 
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}