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
  IconButton,
  Alert,
  Chip,
  Checkbox,
  FormControlLabel,
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import axios from 'axios'

export default function SiteManagement() {
  const [sites, setSites] = useState([])
  const [groups, setGroups] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [openGroupDialog, setOpenGroupDialog] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [editingSite, setEditingSite] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    visible: true,
    health_url: '',
    owner: '',
    ssh_path: '',
    access_methods: [],
    proxy_url: '',
    sign_on_method: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSites()
    loadGroups()
  }, [])

  const loadSites = async () => {
    try {
      const response = await axios.get('/api/admin/sites')
      const sitesWithGroups = await Promise.all(
        response.data.sites.map(async (site) => {
          try {
            const siteRes = await axios.get(`/api/admin/sites/${site.id}`)
            return { 
              ...site, 
              groups: siteRes.data.groups || [],
              roles: siteRes.data.roles || []
            }
          } catch {
            return { ...site, groups: [] }
          }
        })
      )
      setSites(sitesWithGroups)
    } catch (err) {
      console.error('Failed to load sites:', err)
      setError('Failed to load sites')
    }
  }

  const loadGroups = async (searchTerm = '') => {
    try {
      // First try to search LDAP for groups
      try {
        const searchResponse = await axios.post('/api/admin/ldap-groups/search', {
          search: searchTerm
        })
        if (searchResponse.data.groups && searchResponse.data.groups.length > 0) {
          setGroups(searchResponse.data.groups)
          return
        }
      } catch (searchErr) {
        // If search fails, fall back to cached groups
        console.warn('LDAP group search failed, using cached groups:', searchErr)
      }
      
      // Fall back to cached groups from database
      const response = await axios.get('/api/admin/ldap-groups')
      setGroups(response.data.groups || [])
    } catch (err) {
      console.error('Failed to load groups:', err)
      setGroups([])
    }
  }

  const handleOpenDialog = (site = null) => {
    if (site) {
      setEditingSite(site)
      setFormData({
        name: site.name || '',
        url: site.url || '',
        description: site.description || '',
        visible: site.visible !== false,
        health_url: site.health_url || '',
        owner: site.owner || '',
        ssh_path: site.ssh_path || '',
        access_methods: site.access_methods || [],
        proxy_url: site.proxy_url || '',
        sign_on_method: site.sign_on_method || '',
      })
    } else {
      setEditingSite(null)
      setFormData({
        name: '',
        url: '',
        description: '',
        visible: true,
        health_url: '',
        owner: '',
        ssh_path: '',
        access_methods: [],
        proxy_url: '',
        sign_on_method: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.url) {
      setError('Name and URL are required')
      return
    }

    try {
      if (editingSite) {
        await axios.put(`/api/admin/sites/${editingSite.id}`, formData)
        setSuccess('Site updated successfully')
      } else {
        await axios.post('/api/admin/sites', formData)
        setSuccess('Site created successfully')
      }
      setOpenDialog(false)
      loadSites()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save site')
    }
  }

  const handleDelete = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this site?')) {
      return
    }

    try {
      await axios.delete(`/api/admin/sites/${siteId}`)
      setSuccess('Site deleted successfully')
      loadSites()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete site')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Site Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Site
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

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Access Methods</TableCell>
                <TableCell>Proxy</TableCell>
                <TableCell>Sign-On</TableCell>
                <TableCell>Visible</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No sites found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>{site.name}</TableCell>
                    <TableCell>
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        {site.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {site.access_methods && site.access_methods.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {site.access_methods.map((method) => (
                            <Chip key={method} label={method} size="small" />
                          ))}
                        </Box>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{site.proxy_url || 'N/A'}</TableCell>
                    <TableCell>{site.sign_on_method || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={site.visible ? 'Visible' : 'Hidden'}
                        color={site.visible ? 'success' : 'default'}
                        size="small"
                      />
                      {site.groups && site.groups.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {site.groups.length} group(s), {site.roles?.length || 0} role(s)
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => setOpenGroupDialog(site)}
                        sx={{ mr: 1 }}
                      >
                        Manage Groups
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(site)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(site.id)}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingSite ? 'Edit Site' : 'Create Site'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            margin="normal"
            required
            helperText="Must be in allowed proxied hosts"
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
          <TextField
            fullWidth
            label="Health Check URL (optional)"
            value={formData.health_url}
            onChange={(e) => setFormData({ ...formData, health_url: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Owner"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="SSH Path (optional)"
            value={formData.ssh_path}
            onChange={(e) => setFormData({ ...formData, ssh_path: e.target.value })}
            margin="normal"
            helperText="SSH connection path (e.g., user@hostname or hostname)"
            placeholder="user@example.com"
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Access Methods
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Select one or more access methods for this site
            </Typography>
            {['HTTPS', 'HTTP', 'SSH', 'RDP', 'VNC', 'FTP', 'SFTP', 'Other'].map((method) => (
              <FormControlLabel
                key={method}
                control={
                  <Checkbox
                    checked={formData.access_methods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, access_methods: [...formData.access_methods, method] })
                      } else {
                        setFormData({ ...formData, access_methods: formData.access_methods.filter(m => m !== method) })
                      }
                    }}
                  />
                }
                label={method}
              />
            ))}
          </Box>
          <TextField
            fullWidth
            label="Proxy URL (optional)"
            value={formData.proxy_url}
            onChange={(e) => setFormData({ ...formData, proxy_url: e.target.value })}
            margin="normal"
            helperText="Proxy endpoint URL for accessing this site"
            placeholder="https://proxy.example.com/site"
          />
          <TextField
            fullWidth
            label="Sign-On Method (optional)"
            value={formData.sign_on_method}
            onChange={(e) => setFormData({ ...formData, sign_on_method: e.target.value })}
            margin="normal"
            helperText="Authentication method description (e.g., RADIUS, LDAP, OAuth, SAML)"
            placeholder="LDAP"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.visible}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
              />
            }
            label="Visible to users"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingSite ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openGroupDialog} onClose={() => setOpenGroupDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Groups for {openGroupDialog?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Add LDAP groups that should have access to this site
          </Typography>
          <TextField
            fullWidth
            select
            label="LDAP Group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            margin="normal"
            helperText={groups.length === 0 ? 'No groups found. Click "Refresh from LDAP" to search.' : `${groups.length} group(s) available`}
          >
            {groups.length === 0 ? (
              <MenuItem disabled>No groups available</MenuItem>
            ) : (
              groups.map((group) => (
                <MenuItem key={group.id} value={group.dn}>
                  {group.cn || group.dn}
                </MenuItem>
              ))
            )}
          </TextField>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => loadGroups()}
            >
              Refresh from LDAP
            </Button>
            <TextField
              size="small"
              placeholder="Search groups..."
              onChange={(e) => {
                const term = e.target.value
                if (term.length >= 2 || term.length === 0) {
                  loadGroups(term)
                }
              }}
              sx={{ flexGrow: 1 }}
            />
          </Box>
          {openGroupDialog?.groups && openGroupDialog.groups.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Groups:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {openGroupDialog.groups.map((group) => (
                  <Chip
                    key={group.id}
                    label={group.cn || group.dn}
                    onDelete={async () => {
                      try {
                        await axios.delete(`/api/admin/sites/${openGroupDialog.id}/groups/${group.id}`)
                        loadSites()
                        // Reload the dialog data
                        const siteRes = await axios.get(`/api/admin/sites/${openGroupDialog.id}`)
                        setOpenGroupDialog({ ...openGroupDialog, groups: siteRes.data.groups || [], roles: siteRes.data.roles || [] })
                      } catch (err) {
                        setError('Failed to remove group')
                      }
                    }}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {openGroupDialog.roles && openGroupDialog.roles.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Roles with Access (through groups):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {openGroupDialog.roles.map((role) => (
                      <Chip
                        key={role.id}
                        label={role.name}
                        color="success"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenGroupDialog(null)
            setSelectedGroup('')
          }}>
            Close
          </Button>
          <Button
            onClick={async () => {
              if (!selectedGroup) return
              try {
                await axios.post(`/api/admin/sites/${openGroupDialog.id}/groups`, {
                  group_dn: selectedGroup,
                })
                setSuccess('Group added successfully')
                setSelectedGroup('')
                // Reload the dialog data
                const siteRes = await axios.get(`/api/admin/sites/${openGroupDialog.id}`)
                setOpenGroupDialog({ ...openGroupDialog, groups: siteRes.data.groups || [], roles: siteRes.data.roles || [] })
                loadSites()
                setTimeout(() => setSuccess(''), 3000)
              } catch (err) {
                setError(err.response?.data?.error || 'Failed to add group')
              }
            }}
            variant="contained"
            disabled={!selectedGroup}
          >
            Add Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
