'use client'
import { useState, useEffect } from 'react'
import { Container, Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, AppBar, Toolbar, Avatar, Menu, MenuItem, IconButton, Chip, TextField, Grid, Card, CardContent } from '@mui/material'
import { AccountCircle, Logout, AccessTime, FilterList, Download } from '@mui/icons-material'
import { apiGet } from '@/lib/api'

interface AttendanceRecord {
  id: number
  employee_id: number
  employee_name: string
  employee_code: string
  date: string
  check_in: string | null
  check_out: string | null
  created_at: string
}

export default function AttendanceManagement() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  useEffect(() => {
    fetchAttendanceRecords()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, dateFilter, employeeFilter])

  const fetchAttendanceRecords = async () => {
    try {
      const result: any = await apiGet('/attendance', {}, 'AdminToken')
      const records = result.data.map((record: any) => ({
        ...record,
        employee_name: `${record.employee.first_name} ${record.employee.last_name}`,
        employee_code: record.employee.employee_id
      }))
      setAttendanceRecords(records)
    } catch (error) {
      console.error('Failed to fetch attendance records:', error)
    }
  }

  const filterRecords = () => {
    let filtered = attendanceRecords

    if (dateFilter) {
      filtered = filtered.filter(record => record.date === dateFilter)
    }

    if (employeeFilter) {
      filtered = filtered.filter(record => 
        record.employee_name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        record.employee_code.toLowerCase().includes(employeeFilter.toLowerCase())
      )
    }

    setFilteredRecords(filtered)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  const getStatusChip = (record: AttendanceRecord) => {
    if (record.check_in && record.check_out) {
      return <Chip label="Complete" color="success" size="small" />
    } else if (record.check_in) {
      return <Chip label="Checked In" color="warning" size="small" />
    } else {
      return <Chip label="Incomplete" color="error" size="small" />
    }
  }

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return 'N/A'
    
    const inTime = new Date(`2000-01-01 ${checkIn}`)
    const outTime = new Date(`2000-01-01 ${checkOut}`)
    const diffMs = outTime.getTime() - inTime.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return `${diffHours.toFixed(1)} hrs`
  }

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = attendanceRecords.filter(record => record.date === today)
    
    const present = todayRecords.filter(record => record.check_in).length
    const complete = todayRecords.filter(record => record.check_in && record.check_out).length
    const checkedIn = todayRecords.filter(record => record.check_in && !record.check_out).length
    
    return { present, complete, checkedIn, total: todayRecords.length }
  }

  const stats = getTodayStats()

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <AccessTime sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            Attendance Management
          </Typography>
          <Button variant="outlined" href="/dashboard" sx={{ mr: 2 }}>Dashboard</Button>
          <Button variant="outlined" href="/employees" sx={{ mr: 2 }}>Employees</Button>
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
        <Typography variant="h4" gutterBottom>
          Employee Attendance Records
        </Typography>

        {/* Today's Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">{stats.present}</Typography>
                <Typography variant="body2" color="text.secondary">Present Today</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">{stats.complete}</Typography>
                <Typography variant="body2" color="text.secondary">Complete</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">{stats.checkedIn}</Typography>
                <Typography variant="body2" color="text.secondary">Still In Office</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="text.primary">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">Total Records</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterList sx={{ mr: 1 }} />
            <Typography variant="h6">Filters</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Employee Name/ID"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                placeholder="Search employee..."
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                onClick={() => {
                  setDateFilter('')
                  setEmployeeFilter('')
                }}
                fullWidth
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Attendance Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Employee Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Working Hours</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.employee_code}</TableCell>
                  <TableCell>{record.employee_name}</TableCell>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.check_in || 'N/A'}</TableCell>
                  <TableCell>{record.check_out || 'N/A'}</TableCell>
                  <TableCell>{calculateWorkingHours(record.check_in, record.check_out)}</TableCell>
                  <TableCell>{getStatusChip(record)}</TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No attendance records found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Box>
  )
}