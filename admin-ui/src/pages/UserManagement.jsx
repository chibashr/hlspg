import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import LockIcon from '@mui/icons-material/Lock'
import axios from 'axios'
import { extractCNFromDN } from '../utils/ldap'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editDialog, setEditDialog] = useState(null)
  const [editData, setEditData] = useState({})
  const [passwordDialog, setPasswordDialog] = useState(null)
  const [passwordData, setPasswordData] = useState({ new_password: '', confirm_password: '' })
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/users')
      setUsers(response.data.users)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (uid) => {
    setRefreshing({ ...refreshing, [uid]: true })
    try {
      await axios.post(`/api/admin/users/${uid}/refresh`)
      setSuccess(`User ${uid} refreshed successfully`)
      loadUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh user')
    } finally {
      setRefreshing({ ...refreshing, [uid]: false })
    }
  }

  const handleEdit = (user) => {
    setEditData({
      display_name: user.display_name || '',
      email: user.email || '',
      disabled: user.disabled || false,
    })
    setEditDialog(user)
  }

  const handleSaveEdit = async () => {
    try {
      await axios.put(`/api/admin/users/${editDialog.id}`, editData)
      setSuccess('User updated successfully')
      setEditDialog(null)
      loadUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user')
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError('')

    // Validation
    if (!passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('All fields are required')
      return
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      await axios.post(`/api/admin/users/${passwordDialog.id}/change-password`, {
        new_password: passwordData.new_password,
      })
      setSuccess(`Password changed successfully for user ${passwordDialog.uid}`)
      setPasswordDialog(null)
      setPasswordData({ new_password: '', confirm_password: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

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

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Display Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Auth Type</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Groups</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.uid}</TableCell>
                    <TableCell>{user.display_name || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.auth_type || (user.dn ? 'LDAP' : 'Local')}
                        size="small"
                        color={user.auth_type === 'LDAP' || user.dn ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.roles?.map((role, idx) => (
                          <Chip key={idx} label={role} size="small" color="primary" />
                        ))}
                        {user.is_local_admin && (
                          <Chip label="Local Admin" size="small" color="warning" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 300 }}>
                        {user.cached_groups?.slice(0, 3).map((group, idx) => {
                          const groupName = extractCNFromDN(group, 25)
                          return (
                            <Chip
                              key={idx}
                              label={groupName}
                              size="small"
                              variant="outlined"
                              title={group}
                              sx={{
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          )
                        })}
                        {user.cached_groups?.length > 3 && (
                          <Chip label={`+${user.cached_groups.length - 3}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.disabled ? 'Disabled' : 'Active'}
                        color={user.disabled ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRefresh(user.uid)}
                        disabled={refreshing[user.uid] || user.is_local_admin}
                        title="Refresh groups from LDAP"
                      >
                        {refreshing[user.uid] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RefreshIcon />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(user)}
                      >
                        <EditIcon />
                      </IconButton>
                      {(!user.dn || user.auth_type === 'Local') && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setPasswordDialog(user)
                            setPasswordData({ new_password: '', confirm_password: '' })
                            setPasswordError('')
                          }}
                          title="Change password"
                        >
                          <LockIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Display Name"
            value={editData.display_name}
            onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            margin="normal"
          />
          <Box sx={{ mt: 2 }}>
            <input
              type="checkbox"
              checked={editData.disabled}
              onChange={(e) => setEditData({ ...editData, disabled: e.target.checked })}
            />
            <label style={{ marginLeft: 8 }}>Disabled</label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={!!passwordDialog} onClose={() => setPasswordDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password for {passwordDialog?.uid}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {passwordError && (
              <Alert severity="error">{passwordError}</Alert>
            )}
            <Alert severity="info">
              This will change the password for this local account. LDAP users must change their password through LDAP.
            </Alert>
            <TextField
              label="New Password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              fullWidth
              required
              disabled={changingPassword}
              helperText="Must be at least 8 characters long"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              fullWidth
              required
              disabled={changingPassword}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialog(null)
            setPasswordData({ new_password: '', confirm_password: '' })
            setPasswordError('')
          }} disabled={changingPassword}>
            Cancel
          </Button>
          <Button onClick={handlePasswordChange} variant="contained" disabled={changingPassword}>
            {changingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
