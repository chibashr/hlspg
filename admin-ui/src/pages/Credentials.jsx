import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import axios from 'axios'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function Credentials() {
  const [credentials, setCredentials] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCredential, setEditingCredential] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    credential_type: 'ssh_key',
    data: '',
    site_ids: [],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [credentialsRes, sitesRes] = await Promise.all([
        axios.get('/api/credentials'),
        axios.get('/api/sites'),
      ])
      setCredentials(credentialsRes.data.credentials || [])
      setSites(sitesRes.data.sites || [])
    } catch (err) {
      console.error('Failed to load credentials data:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load data'
      setError(errorMessage)
      
      if (err.response?.status === 401) {
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (credential = null) => {
    if (credential) {
      setEditingCredential(credential)
      setFormData({
        name: credential.name,
        credential_type: credential.credential_type,
        data: '', // Don't show existing data for security
        site_ids: credential.associated_site_ids || [],
      })
    } else {
      setEditingCredential(null)
      setFormData({
        name: '',
        credential_type: 'ssh_key',
        data: '',
        site_ids: [],
      })
    }
    setOpenDialog(true)
    setError('')
    setSuccess('')
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCredential(null)
    setFormData({
      name: '',
      credential_type: 'ssh_key',
      data: '',
      site_ids: [],
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.data) {
      setError('Name and credential data are required')
      return
    }

    try {
      setError('')
      setSuccess('')
      
      if (editingCredential) {
        // Update existing credential
        await axios.put(`/api/credentials/${editingCredential.id}`, {
          name: formData.name,
          data: formData.data,
          site_ids: formData.site_ids,
        })
        setSuccess('Credential updated successfully')
      } else {
        // Create new credential
        await axios.post('/api/credentials', {
          name: formData.name,
          credential_type: formData.credential_type,
          data: formData.data,
          site_ids: formData.site_ids,
        })
        setSuccess('Credential created successfully')
      }
      
      await loadData()
      setTimeout(() => {
        handleCloseDialog()
        setSuccess('')
      }, 1000)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save credential'
      setError(errorMessage)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) {
      return
    }

    try {
      await axios.delete(`/api/credentials/${id}`)
      setSuccess('Credential deleted successfully')
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete credential'
      setError(errorMessage)
    }
  }

  const toggleSiteAssociation = (siteId) => {
    setFormData((prev) => {
      const currentIds = prev.site_ids || []
      if (currentIds.includes(siteId)) {
        return { ...prev, site_ids: currentIds.filter((id) => id !== siteId) }
      } else {
        return { ...prev, site_ids: [...currentIds, siteId] }
      }
    })
  }

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VpnKeyIcon sx={{ fontSize: 40 }} color="primary" />
            <Typography variant="h4" component="h1">
              My Credentials
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Credential
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage your SSH keys, certificates, and passwords. Associate credentials with specific sites for easier access.
        </Typography>
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

      {credentials.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <VpnKeyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No credentials on file
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first credential to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Credential
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {credentials.map((cred) => (
            <Grid item xs={12} md={6} key={cred.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{cred.name}</Typography>
                    <Chip
                      label={cred.credential_type.toUpperCase()}
                      size="small"
                      color={cred.credential_type === 'ssh_key' ? 'primary' : cred.credential_type === 'certificate' ? 'secondary' : 'default'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Created: {cred.created_at ? new Date(cred.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                  {cred.associated_sites && cred.associated_sites.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Associated Sites:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {cred.associated_sites.map((site) => (
                          <Chip key={site.id} label={site.name} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No sites associated
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(cred)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(cred.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCredential ? 'Edit Credential' : 'Add New Credential'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Credential Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            helperText="A descriptive name for this credential"
          />
          {!editingCredential && (
            <TextField
              fullWidth
              select
              label="Credential Type"
              value={formData.credential_type}
              onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
              margin="normal"
              required
            >
              <MenuItem value="ssh_key">SSH Key</MenuItem>
              <MenuItem value="certificate">Certificate</MenuItem>
              <MenuItem value="password">Password</MenuItem>
            </TextField>
          )}
          {editingCredential && (
            <TextField
              fullWidth
              label="Credential Type"
              value={formData.credential_type}
              margin="normal"
              disabled
              helperText="Credential type cannot be changed after creation"
            />
          )}
          <TextField
            fullWidth
            label="Credential Data"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            margin="normal"
            required
            multiline
            rows={6}
            helperText={
              formData.credential_type === 'ssh_key'
                ? 'Paste your public SSH key here'
                : formData.credential_type === 'certificate'
                ? 'Paste your certificate data here'
                : 'Enter your password (stored securely)'
            }
            placeholder={
              formData.credential_type === 'ssh_key'
                ? 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...'
                : formData.credential_type === 'certificate'
                ? '-----BEGIN CERTIFICATE-----\n...'
                : 'Enter password'
            }
          />
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Associate with Sites (optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which sites this credential should be associated with
            </Typography>
            {sites.length === 0 ? (
              <Alert severity="info">No sites available</Alert>
            ) : (
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {sites.map((site) => (
                    <ListItem key={site.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.site_ids.includes(site.id)}
                            onChange={() => toggleSiteAssociation(site.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{site.name}</Typography>
                            {site.url && (
                              <Typography variant="caption" color="text.secondary">
                                {site.url}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingCredential ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

