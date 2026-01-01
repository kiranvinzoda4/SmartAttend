'use client'
import { useState, useEffect } from 'react'
import { Container, Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, AppBar, Toolbar, Avatar, Menu, MenuItem, Chip, Select, FormControl, InputLabel } from '@mui/material'
import { Add, Edit, Delete, AccountCircle, Logout, People, CameraAlt, Visibility } from '@mui/icons-material'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import CameraCapture from '../components/CameraCapture'

interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department_id: number
  department_name: string
  position: string
  hire_date: string
  is_active: boolean
  created_at: string
}

interface Department {
  id: number
  name: string
  is_active: boolean
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [open, setOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '', first_name: '', last_name: '', email: '', phone: '',
    department_id: '', position: '', hire_date: '', is_active: true
  })
  const [faceImages, setFaceImages] = useState({
    left: null as Blob | null,
    center: null as Blob | null,
    right: null as Blob | null
  })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [currentCapture, setCurrentCapture] = useState<'left' | 'center' | 'right' | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
  }, [])

  const fetchEmployees = async () => {
    try {
      const result: any = await apiGet('/employees', {}, 'AdminToken')
      setEmployees(result.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const result: any = await apiGet('/departments', {}, 'AdminToken')
      setDepartments(result.data.filter((d: Department) => d.is_active === true))
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingEmp) {
        const payload = {
          ...formData,
          department_id: parseInt(formData.department_id)
        }
        await apiPut(`/employees/${editingEmp.id}`, payload, {}, 'AdminToken')
      } else {
        const formDataToSend = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'department_id') {
            formDataToSend.append(key, parseInt(value as string).toString())
          } else {
            formDataToSend.append(key, value as string)
          }
        })
        
        if (faceImages.left) formDataToSend.append('face_left', faceImages.left)
        if (faceImages.center) formDataToSend.append('face_center', faceImages.center)
        if (faceImages.right) formDataToSend.append('face_right', faceImages.right)
        
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:8000/employees', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataToSend
        })
        
        if (!response.ok) throw new Error('Failed to create employee')
      }
      
      fetchEmployees()
      handleClose()
    } catch (error) {
      console.error('Failed to save employee:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await apiDelete(`/employees/${id}`)
        fetchEmployees()
      } catch (error) {
        console.error('Failed to delete employee:', error)
      }
    }
  }

  const handleEdit = (emp: Employee) => {
    setEditingEmp(emp)
    setFormData({
      employee_id: emp.employee_id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || '',
      department_id: emp.department_id.toString(),
      position: emp.position || '',
      hire_date: emp.hire_date,
      is_active: emp.is_active
    })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingEmp(null)
    setFormData({
      employee_id: '', first_name: '', last_name: '', email: '', phone: '',
      department_id: '', position: '', hire_date: '', is_active: true
    })
    setFaceImages({ left: null, center: null, right: null })
  }

  const handleCameraCapture = (position: 'left' | 'center' | 'right') => {
    setCurrentCapture(position)
    setCameraOpen(true)
  }

  const handleImageCapture = (imageBlob: Blob) => {
    if (currentCapture) {
      setFaceImages(prev => ({ ...prev, [currentCapture]: imageBlob }))
    }
    setCameraOpen(false)
    setCurrentCapture(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <People sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            Employee Management
          </Typography>
          <Button variant="outlined" href="/dashboard" sx={{ mr: 2 }}>Dashboard</Button>
          <Button variant="outlined" href="/departments" sx={{ mr: 2 }}>Departments</Button>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Employees</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add Employee
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.employee_id}</TableCell>
                  <TableCell>{`${emp.first_name} ${emp.last_name}`}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.department_name}</TableCell>
                  <TableCell>{emp.position || '-'}</TableCell>
                  <TableCell>{new Date(emp.hire_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={emp.is_active ? 'Active' : 'Inactive'} 
                      color={emp.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton href={`/employees/${emp.id}`} color="info">
                      <Visibility />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(emp)} color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(emp.id)} color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editingEmp ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <TextField
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
              />
              <FormControl>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  label="Department"
                  required
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
              <TextField
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <TextField
                label="Position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
              <TextField
                label="Hire Date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
            
            {!editingEmp && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Face Images (Required for Face Recognition)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" gutterBottom>Left Side</Typography>
                    <Button 
                      variant={faceImages.left ? "contained" : "outlined"} 
                      startIcon={<CameraAlt />}
                      onClick={() => handleCameraCapture('left')}
                      fullWidth
                    >
                      {faceImages.left ? 'Retake' : 'Capture'}
                    </Button>
                  </Box>
                  <Box>
                    <Typography variant="body2" gutterBottom>Center (Front)</Typography>
                    <Button 
                      variant={faceImages.center ? "contained" : "outlined"} 
                      startIcon={<CameraAlt />}
                      onClick={() => handleCameraCapture('center')}
                      fullWidth
                    >
                      {faceImages.center ? 'Retake' : 'Capture'}
                    </Button>
                  </Box>
                  <Box>
                    <Typography variant="body2" gutterBottom>Right Side</Typography>
                    <Button 
                      variant={faceImages.right ? "contained" : "outlined"} 
                      startIcon={<CameraAlt />}
                      onClick={() => handleCameraCapture('right')}
                      fullWidth
                    >
                      {faceImages.right ? 'Retake' : 'Capture'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingEmp ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <CameraCapture
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={handleImageCapture}
          title={`Capture ${currentCapture} side face`}
        />
      </Container>
    </Box>
  )
}