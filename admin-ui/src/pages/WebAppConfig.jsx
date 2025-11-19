import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import axios from 'axios'

export default function WebAppConfig() {
  const [config, setConfig] = useState({
    app_title: 'HLSPG Portal',
    page_title: 'Home Lab Single Pane of Glass',
    domain: '',
    primary_color: '#1976d2',
    secondary_color: '#dc004e',
    logo_url: '',
    favicon_url: '',
    footer_text: '',
    login_title: '',
    login_subtitle: '',
    login_description: '',
    cors_enabled: false,
    proxy_host_validation_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/webapp-config')
      setConfig(response.data)
    } catch (err) {
      setError('Failed to load webapp configuration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setConfig({ ...config, [field]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      await axios.put('/api/admin/webapp-config', config)
      setSuccess('Webapp configuration saved successfully')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Web App Configuration
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
        Web App Configuration
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Branding & Display
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="App Title"
              value={config.app_title}
              onChange={(e) => handleChange('app_title', e.target.value)}
              margin="normal"
              helperText="Main application title (shown in navigation)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Page Title"
              value={config.page_title}
              onChange={(e) => handleChange('page_title', e.target.value)}
              margin="normal"
              helperText="Browser page title (shown in browser tab)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Domain"
              value={config.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              margin="normal"
              placeholder="example.com"
              helperText="Primary domain name"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Footer Text"
              value={config.footer_text}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              margin="normal"
              helperText="Text to display in footer"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Theme Colors
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Primary Color"
              type="color"
              value={config.primary_color}
              onChange={(e) => handleChange('primary_color', e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="Main theme color"
            />
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: config.primary_color,
                  borderRadius: 1,
                  border: '1px solid #ccc',
                }}
              />
              <TextField
                size="small"
                value={config.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                placeholder="#1976d2"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Secondary Color"
              type="color"
              value={config.secondary_color}
              onChange={(e) => handleChange('secondary_color', e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="Accent theme color"
            />
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: config.secondary_color,
                  borderRadius: 1,
                  border: '1px solid #ccc',
                }}
              />
              <TextField
                size="small"
                value={config.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                placeholder="#dc004e"
              />
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Login Page Customization
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Login Title"
              value={config.login_title}
              onChange={(e) => handleChange('login_title', e.target.value)}
              margin="normal"
              helperText="Custom title shown on login page (defaults to 'HLSPG Login' if empty)"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Login Subtitle"
              value={config.login_subtitle}
              onChange={(e) => handleChange('login_subtitle', e.target.value)}
              margin="normal"
              helperText="Optional subtitle shown below the login title"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Login Description"
              value={config.login_description}
              onChange={(e) => handleChange('login_description', e.target.value)}
              margin="normal"
              multiline
              rows={3}
              helperText="Optional description or instructions shown on login page"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Assets
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Logo URL"
              value={config.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              margin="normal"
              placeholder="https://example.com/logo.png"
              helperText="URL to logo image"
            />
            {config.logo_url && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={config.logo_url}
                  alt="Logo preview"
                  style={{ maxHeight: 60, maxWidth: 200 }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Favicon URL"
              value={config.favicon_url}
              onChange={(e) => handleChange('favicon_url', e.target.value)}
              margin="normal"
              placeholder="https://example.com/favicon.ico"
              helperText="URL to favicon"
            />
            {config.favicon_url && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={config.favicon_url}
                  alt="Favicon preview"
                  style={{ maxHeight: 32, maxWidth: 32 }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </Box>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Security & Network Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.cors_enabled}
                  onChange={(e) => handleChange('cors_enabled', e.target.checked)}
                />
              }
              label="Enable CORS (Cross-Origin Resource Sharing)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
              Allow cross-origin requests. Enable this if you're accessing the portal from a different domain or port.
              Changes take effect immediately.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.proxy_host_validation_enabled}
                  onChange={(e) => handleChange('proxy_host_validation_enabled', e.target.checked)}
                />
              }
              label="Enable Proxy Host Validation"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
              Validate that proxied URLs match the ALLOWED_PROXIED_HOSTS environment variable.
              Disable this if you're getting 403 errors when using a reverse proxy.
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

