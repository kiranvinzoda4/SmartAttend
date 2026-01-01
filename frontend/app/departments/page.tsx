'use client'
import { useState, useEffect } from 'react'
import { Container, Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, AppBar, Toolbar, Avatar, Menu, MenuItem, Chip } from '@mui/material'
import { Add, Edit, Delete, AccountCircle, Logout, Business } from '@mui/icons-material'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'

interface Department {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [open, setOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const result: any = await apiGet('/departments', {}, 'AdminToken')
      setDepartments(result.data)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingDept) {
        await apiPut(`/departments/${editingDept.id}`, formData, {}, 'AdminToken')
      } else {
        await apiPost('/departments', formData, {}, 'AdminToken')
      }
      fetchDepartments()
      handleClose()
    } catch (error) {
      console.error('Failed to save department:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await apiDelete(`/departments/${id}`)
        fetchDepartments()
      } catch (error) {
        console.error('Failed to delete department:', error)
      }
    }
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormData({ name: dept.name, description: dept.description, is_active: dept.is_active })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingDept(null)
    setFormData({ name: '', description: '', is_active: true })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Business sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            Department Management
          </Typography>
          <Button variant="outlined" href="/dashboard" sx={{ mr: 2 }}>Dashboard</Button>
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Departments</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add Department
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{dept.description || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={dept.is_active ? 'Active' : 'Inactive'} 
                      color={dept.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(dept.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(dept)} color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(dept.id)} color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Department Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}