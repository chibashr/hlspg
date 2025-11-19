import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Grid,
  Button,
  Divider,
  Chip,
  IconButton,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import InfoIcon from '@mui/icons-material/Info'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import axios from 'axios'

export default function LDAPConfig() {
  const [config, setConfig] = useState({
    ldap_url: '',
    ldap_use_tls: true,
    ldap_bind_dn: '',
    ldap_bind_password: '',
    ldap_base_dn: '',
    ldap_user_dn: '',
    ldap_group_dn: '',
    ldap_user_filter: '',
    ldap_group_filter: '',
    ldap_group_attribute: 'memberOf',
    ldap_ca_cert: '',
    ldap_search_timeout: 5,
    enabled: false,
  })
  const [originalConfig, setOriginalConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [caFile, setCaFile] = useState(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/ldap/config')
      const data = response.data
      setConfig({
        ldap_url: data.ldap_url || '',
        ldap_use_tls: data.ldap_use_tls !== false,
        ldap_bind_dn: data.ldap_bind_dn || '',
        ldap_bind_password: data.ldap_bind_password || '',
        ldap_base_dn: data.ldap_base_dn || '',
        ldap_user_dn: data.ldap_user_dn || '',
        ldap_group_dn: data.ldap_group_dn || '',
        ldap_user_filter: data.ldap_user_filter || '',
        ldap_group_filter: data.ldap_group_filter || '',
        ldap_group_attribute: data.ldap_group_attribute || 'memberOf',
        ldap_ca_cert: data.ldap_ca_cert || '',
        ldap_search_timeout: data.ldap_search_timeout || 5,
        enabled: data.enabled || false,
      })
      setOriginalConfig(data)
      setPasswordChanged(false)
    } catch (err) {
      setError('Failed to load LDAP configuration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    if (field === 'ldap_bind_password') {
      setPasswordChanged(true)
    }
    setConfig({ ...config, [field]: value })
  }

  const validateConfig = () => {
    const errors = []
    
    if (!config.ldap_url || config.ldap_url.trim() === '') {
      errors.push('LDAP URL is required')
    }
    
    if (!config.ldap_base_dn || config.ldap_base_dn.trim() === '') {
      errors.push('Base DN is required')
    }
    
    if (config.ldap_use_tls && (!config.ldap_ca_cert || config.ldap_ca_cert.trim() === '')) {
      errors.push('CA Certificate is required when TLS is enabled')
    }
    
    // Validate URL format
    if (config.ldap_url && !config.ldap_url.match(/^ldap[s]?:\/\/.+/)) {
      errors.push('LDAP URL must start with ldap:// or ldaps://')
    }
    
    return errors
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    
    // Validate required fields
    const validationErrors = validateConfig()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '))
      setSaving(false)
      return
    }
    
    try {
      const payload = { ...config }
      // Don't send password if it wasn't changed (still shows ***)
      if (!passwordChanged && payload.ldap_bind_password === '***') {
        delete payload.ldap_bind_password
      }
      // Enable DB config when saving
      payload.enabled = true
      
      await axios.put('/api/admin/ldap/config', payload)
      setSuccess('LDAP configuration saved successfully')
      setPasswordChanged(false)
      loadConfig()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save configuration'
      const errorDetails = err.response?.data?.details
      if (errorDetails && Array.isArray(errorDetails)) {
        setError(errorMsg + ': ' + errorDetails.join(', '))
      } else {
        setError(errorMsg)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    if (!file.name.match(/\.(pem|crt|cer|cert)$/i)) {
      setError('Invalid file type. Only .pem, .crt, .cer, .cert files are allowed')
      return
    }
    
    setUploading(true)
    setError('')
    setSuccess('')
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('/api/admin/ldap/config/ca-cert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setSuccess('CA certificate uploaded successfully')
      setCaFile(null)
      loadConfig()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload certificate')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteCert = async () => {
    if (!window.confirm('Are you sure you want to delete the CA certificate?')) {
      return
    }
    
    try {
      await axios.delete('/api/admin/ldap/config/ca-cert')
      setSuccess('CA certificate deleted successfully')
      loadConfig()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete certificate')
    }
  }

  const handleToggleEnabled = async (enabled) => {
    try {
      await axios.put('/api/admin/ldap/config', { enabled })
      setSuccess(enabled ? 'Using database configuration' : 'Using environment variables')
      loadConfig()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to update configuration')
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          LDAP Configuration
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography>Loading...</Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        LDAP Configuration
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

      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Configuration Source
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={(e) => {
                  handleChange('enabled', e.target.checked)
                  handleToggleEnabled(e.target.checked)
                }}
              />
            }
            label={config.enabled ? 'Database (Active)' : 'Environment Variables (Active)'}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {config.enabled 
            ? 'Database configuration is active and overrides environment variables.'
            : 'Environment variables are active. Enable database configuration to override.'}
        </Typography>
        {originalConfig?.source && (
          <Chip 
            label={`Source: ${originalConfig.source}`} 
            size="small" 
            sx={{ mt: 1 }}
            color={originalConfig.source === 'database' ? 'primary' : 'default'}
          />
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="LDAP URL"
              value={config.ldap_url}
              onChange={(e) => handleChange('ldap_url', e.target.value)}
              margin="normal"
              placeholder="ldaps://ldap.example.com:636"
              helperText="LDAP server URL (ldap:// or ldaps://) - Required"
              disabled={!config.enabled}
              error={!config.ldap_url && config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.ldap_use_tls}
                  onChange={(e) => handleChange('ldap_use_tls', e.target.checked)}
                  disabled={!config.enabled}
                />
              }
              label="Use TLS"
              sx={{ mt: 2 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bind DN"
              value={config.ldap_bind_dn}
              onChange={(e) => handleChange('ldap_bind_dn', e.target.value)}
              margin="normal"
              placeholder="cn=portal-service,ou=services,dc=example,dc=com"
              helperText="Service account DN for LDAP bind (recommended)"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bind Password"
              type="password"
              value={config.ldap_bind_password}
              onChange={(e) => handleChange('ldap_bind_password', e.target.value)}
              margin="normal"
              placeholder={passwordChanged ? "Enter new password" : "••••••••"}
              helperText="Service account password"
              disabled={!config.enabled && !passwordChanged}
            />
            {originalConfig?.ldap_bind_password && !passwordChanged && (
              <Chip
                label="Password is set"
                color="success"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Base DN"
              value={config.ldap_base_dn}
              onChange={(e) => handleChange('ldap_base_dn', e.target.value)}
              margin="normal"
              placeholder="dc=example,dc=com"
              helperText="Base DN for LDAP (fallback if User/Group DN not specified) - Required"
              disabled={!config.enabled}
              error={!config.ldap_base_dn && config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="User DN"
              value={config.ldap_user_dn}
              onChange={(e) => handleChange('ldap_user_dn', e.target.value)}
              margin="normal"
              placeholder="ou=users,dc=example,dc=com"
              helperText="DN where users are located (optional, uses Base DN if not set)"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Group DN"
              value={config.ldap_group_dn}
              onChange={(e) => handleChange('ldap_group_dn', e.target.value)}
              margin="normal"
              placeholder="ou=groups,dc=example,dc=com"
              helperText="DN where groups are located (optional, uses Base DN if not set)"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="User Filter"
              value={config.ldap_user_filter}
              onChange={(e) => handleChange('ldap_user_filter', e.target.value)}
              margin="normal"
              multiline
              rows={2}
              helperText="LDAP filter for user searches. Use {username} as placeholder."
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Group Filter"
              value={config.ldap_group_filter}
              onChange={(e) => handleChange('ldap_group_filter', e.target.value)}
              margin="normal"
              placeholder="(objectClass=group)"
              helperText="LDAP filter for group searches (e.g., (objectClass=group) or (objectClass=groupOfNames))"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Group Attribute"
              value={config.ldap_group_attribute}
              onChange={(e) => handleChange('ldap_group_attribute', e.target.value)}
              margin="normal"
              helperText="LDAP attribute containing group memberships"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Timeout (seconds)"
              type="number"
              value={config.ldap_search_timeout}
              onChange={(e) => handleChange('ldap_search_timeout', parseInt(e.target.value) || 5)}
              margin="normal"
              helperText="Timeout for LDAP search operations"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                required={config.ldap_use_tls}
                label="CA Certificate Path"
                value={config.ldap_ca_cert}
                onChange={(e) => handleChange('ldap_ca_cert', e.target.value)}
                margin="normal"
                placeholder="/app/certs/ldap_ca.pem"
                helperText={config.ldap_use_tls 
                  ? "Path to CA certificate file for TLS verification - Required when TLS is enabled"
                  : "Path to CA certificate file for TLS verification"}
                disabled={!config.enabled}
                error={config.ldap_use_tls && !config.ldap_ca_cert && config.enabled}
              />
              <Box sx={{ mt: 2 }}>
                <input
                  accept=".pem,.crt,.cer,.cert"
                  style={{ display: 'none' }}
                  id="ca-cert-upload"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={!config.enabled || uploading}
                />
                <label htmlFor="ca-cert-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadFileIcon />}
                    disabled={!config.enabled || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload CA Cert'}
                  </Button>
                </label>
                {config.ldap_ca_cert && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleDeleteCert}
                    disabled={!config.enabled}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
            {config.ldap_ca_cert && (
              <Chip
                label={`CA Cert: ${config.ldap_ca_cert.split('/').pop()}`}
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {config.enabled 
              ? 'Configuration will be saved to database and override environment variables.'
              : 'Enable database configuration to save changes.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!config.enabled || saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Environment Variables Reference
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These environment variables are used when database configuration is disabled:
        </Typography>
        <Box component="pre" sx={{ 
          bgcolor: 'grey.100', 
          p: 2, 
          borderRadius: 1, 
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`LDAP_URL=ldaps://ldap.example.com:636
LDAP_USE_TLS=true
LDAP_BIND_DN=cn=portal-service,ou=services,dc=example,dc=com
LDAP_BIND_PASSWORD=your-password-here
LDAP_BASE_DN=dc=example,dc=com
LDAP_USER_FILTER=(|(uid={username})(sAMAccountName={username})(mail={username}))
LDAP_GROUP_ATTRIBUTE=memberOf
LDAP_CA_CERT=/run/secrets/ldap_ca.pem
LDAP_SEARCH_TIMEOUT=5`}
        </Box>
      </Paper>
    </Box>
  )
}
