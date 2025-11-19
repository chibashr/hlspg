import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  Grid,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import axios from 'axios'

export default function RoleManagement() {
  const [mappings, setMappings] = useState([])
  const [roles, setRoles] = useState([])
  const [groups, setGroups] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [mappingsRes, rolesRes, groupsRes] = await Promise.all([
        axios.get('/api/admin/role-mappings'),
        axios.get('/api/admin/roles'),
        axios.get('/api/admin/ldap-groups'),
      ])
      setMappings(mappingsRes.data.mappings)
      setRoles(rolesRes.data.roles)
      setGroups(groupsRes.data.groups)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load data')
    }
  }

  const handleCreate = async () => {
    if (!selectedGroup || !selectedRole) {
      setError('Please select both a group and a role')
      return
    }

    try {
      await axios.post('/api/admin/role-mappings', {
        ldap_group_dn: selectedGroup,
        role_name: selectedRole,
      })
      setSuccess('Role mapping created successfully')
      setOpenDialog(false)
      setSelectedGroup('')
      setSelectedRole('')
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create mapping')
    }
  }

  const handleDelete = async (mappingId) => {
    if (!window.confirm('Are you sure you want to delete this mapping?')) {
      return
    }

    try {
      await axios.delete(`/api/admin/role-mappings/${mappingId}`)
      setSuccess('Mapping deleted successfully')
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete mapping')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Role Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Mapping
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>LDAP Group</TableCell>
                    <TableCell>CN</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No role mappings found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>{mapping.ldap_group.dn}</TableCell>
                        <TableCell>{mapping.ldap_group.cn || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip label={mapping.role.name} color="primary" size="small" />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Roles
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {roles.map((role) => (
                <Chip
                  key={role.id}
                  label={`${role.name} - ${role.description || ''}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Role Mapping</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="LDAP Group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            margin="normal"
          >
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.dn}>
                {group.cn || group.dn}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="Application Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            margin="normal"
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.name}>
                {role.name} - {role.description || ''}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
