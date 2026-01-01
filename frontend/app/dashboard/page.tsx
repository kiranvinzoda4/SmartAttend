'use client'
import { useState, useEffect } from 'react'
import { Container, Paper, Typography, Box, Button, AppBar, Toolbar, Avatar, Menu, MenuItem, IconButton, Card, CardContent, Grid } from '@mui/material'
import { AccountCircle, Logout, Business, People, AccessTime, Dashboard as DashboardIcon } from '@mui/icons-material'
import { apiGet } from '@/lib/api'

interface UserProfile {
  id: number
  email: string
  full_name: string
  is_verified: boolean
  created_at: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const result: any = await apiGet('/user/profile', {}, 'AdminToken')
      setUser(result.data)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            SmartAttend - HR Management
          </Typography>
          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h3" color="primary.main" gutterBottom>
              Welcome to SmartAttend
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              HR Management & Employee Attendance System
            </Typography>
            {user && (
              <Typography variant="body1" color="text.primary">
                Hello, {user.full_name}! Manage your organization efficiently.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Quick Actions
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => window.location.href = '/departments'}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Business sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Departments
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create and manage company departments
                </Typography>
                <Button variant="contained" fullWidth>
                  Manage Departments
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => window.location.href = '/employees'}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <People sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Employees
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Add, edit and manage employee records
                </Typography>
                <Button variant="contained" fullWidth>
                  Manage Employees
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => window.location.href = '/attendance-management'}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <AccessTime sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Attendance
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  View and manage employee attendance records
                </Typography>
                <Button variant="contained" fullWidth>
                  Manage Attendance
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}