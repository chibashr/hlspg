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
  Switch,
  FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SecurityIcon from '@mui/icons-material/Security'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import axios from 'axios'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [editingCertificate, setEditingCertificate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    certificate_data: '',
    filename: '',
    enabled: true,
  })
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    filename: '',
    enabled: true,
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/certificates')
      setCertificates(response.data.certificates || [])
    } catch (err) {
      console.error('Failed to load certificates:', err)
      setError('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (certificate = null) => {
    if (certificate) {
      // Fetch full certificate data for editing
      axios.get(`/api/admin/certificates/${certificate.id}`)
        .then((response) => {
          setEditingCertificate(certificate)
          setFormData({
            name: response.data.name || '',
            description: response.data.description || '',
            certificate_data: response.data.certificate_data || '',
            filename: response.data.filename || '',
            enabled: response.data.enabled !== undefined ? response.data.enabled : true,
          })
          setOpenDialog(true)
          setError('')
          setSuccess('')
        })
        .catch((err) => {
          setError('Failed to load certificate details')
        })
    } else {
      setEditingCertificate(null)
      setFormData({
        name: '',
        description: '',
        certificate_data: '',
        filename: '',
        enabled: true,
      })
      setOpenDialog(true)
      setError('')
      setSuccess('')
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCertificate(null)
    setFormData({
      name: '',
      description: '',
      certificate_data: '',
      filename: '',
      enabled: true,
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.certificate_data || !formData.filename) {
      setError('Name, certificate data, and filename are required')
      return
    }

    try {
      setError('')
      setSuccess('')
      
      if (editingCertificate) {
        await axios.put(`/api/admin/certificates/${editingCertificate.id}`, formData)
        setSuccess('Certificate updated successfully')
      } else {
        await axios.post('/api/admin/certificates', formData)
        setSuccess('Certificate created successfully')
      }
      
      await loadCertificates()
      setTimeout(() => {
        handleCloseDialog()
        setSuccess('')
      }, 1000)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save certificate'
      setError(errorMessage)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) {
      return
    }

    try {
      await axios.delete(`/api/admin/certificates/${id}`)
      setSuccess('Certificate deleted successfully')
      await loadCertificates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete certificate'
      setError(errorMessage)
    }
  }

  if (loading && certificates.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ fontSize: 40 }} color="primary" />
          <Typography variant="h4" component="h1">
            Certificate Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => {
              setUploadDialog(true)
              setUploadData({
                name: '',
                description: '',
                filename: '',
                enabled: true,
              })
              setSelectedFile(null)
              setError('')
              setSuccess('')
            }}
          >
            Upload Certificate
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Certificate
          </Button>
        </Box>
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
                <TableCell>Description</TableCell>
                <TableCell>Filename</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No certificates configured. Click "Add Certificate" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {cert.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cert.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {cert.filename}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cert.enabled ? 'Enabled' : 'Disabled'}
                        color={cert.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {cert.created_at ? new Date(cert.created_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(cert)}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(cert.id)}
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCertificate ? 'Edit Certificate' : 'Add New Certificate'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Certificate Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="A descriptive name for this certificate (e.g., 'Company CA Certificate')"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              helperText="Instructions for users on how to install this certificate"
            />
            <TextField
              fullWidth
              label="Filename"
              value={formData.filename}
              onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
              required
              helperText="Suggested filename for download (e.g., 'ca-cert.pem', 'company-root.crt')"
            />
            <TextField
              fullWidth
              label="Certificate Data (PEM format)"
              value={formData.certificate_data}
              onChange={(e) => setFormData({ ...formData, certificate_data: e.target.value })}
              required
              multiline
              rows={10}
              helperText="Paste the certificate in PEM format (-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----)"
              sx={{ fontFamily: 'monospace' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Enabled (visible to users)"
            />
            {error && (
              <Alert severity="error">{error}</Alert>
            )}
            {success && (
              <Alert severity="success">{success}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingCertificate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Certificate Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Certificate File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <input
                accept=".pem,.crt,.cer,.cert"
                style={{ display: 'none' }}
                id="certificate-file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="certificate-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {selectedFile ? selectedFile.name : 'Select Certificate File (.pem, .crt, .cer, .cert)'}
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              label="Certificate Name"
              value={uploadData.name}
              onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
              required
              helperText="A descriptive name for this certificate"
            />
            <TextField
              fullWidth
              label="Description"
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              multiline
              rows={2}
              helperText="Instructions for users on how to install this certificate"
            />
            <TextField
              fullWidth
              label="Filename"
              value={uploadData.filename}
              onChange={(e) => setUploadData({ ...uploadData, filename: e.target.value })}
              required
              helperText="Suggested filename for download (defaults to uploaded filename)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={uploadData.enabled}
                  onChange={(e) => setUploadData({ ...uploadData, enabled: e.target.checked })}
                />
              }
              label="Enabled (visible to users)"
            />
            {error && (
              <Alert severity="error">{error}</Alert>
            )}
            {success && (
              <Alert severity="success">{success}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading || !selectedFile}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Certificate Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Certificate File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <input
                accept=".pem,.crt,.cer,.cert"
                style={{ display: 'none' }}
                id="certificate-file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="certificate-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {selectedFile ? selectedFile.name : 'Select Certificate File (.pem, .crt, .cer, .cert)'}
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              label="Certificate Name"
              value={uploadData.name}
              onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
              required
              helperText="A descriptive name for this certificate"
            />
            <TextField
              fullWidth
              label="Description"
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              multiline
              rows={2}
              helperText="Instructions for users on how to install this certificate"
            />
            <TextField
              fullWidth
              label="Filename"
              value={uploadData.filename}
              onChange={(e) => setUploadData({ ...uploadData, filename: e.target.value })}
              required
              helperText="Suggested filename for download (defaults to uploaded filename)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={uploadData.enabled}
                  onChange={(e) => setUploadData({ ...uploadData, enabled: e.target.checked })}
                />
              }
              label="Enabled (visible to users)"
            />
            {error && (
              <Alert severity="error">{error}</Alert>
            )}
            {success && (
              <Alert severity="success">{success}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading || !selectedFile}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

