import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  FormControlLabel,
  Switch,
  MenuItem,
  Chip,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import axios from 'axios'

export default function SSOConfig() {
  const [config, setConfig] = useState({
    provider: 'oidc',
    enabled: false,
    issuer_url: '',
    authorization_endpoint: '',
    token_endpoint: '',
    userinfo_endpoint: '',
    client_id: '',
    client_secret: '',
    redirect_uri: '',
    scopes: 'openid profile email',
  })
  const [originalConfig, setOriginalConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordChanged, setPasswordChanged] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/sso-config')
      const data = response.data
      // Map response to state, handling legacy fields
      setConfig({
        provider: data.provider || 'oidc',
        enabled: data.enabled || false,
        issuer_url: data.issuer_url || data.sso_url || '',
        authorization_endpoint: data.authorization_endpoint || '',
        token_endpoint: data.token_endpoint || '',
        userinfo_endpoint: data.userinfo_endpoint || '',
        client_id: data.client_id || '',
        client_secret: data.client_secret || '',
        redirect_uri: data.redirect_uri || '',
        scopes: data.scopes || 'openid profile email',
      })
      setOriginalConfig(data)
      setPasswordChanged(false)
    } catch (err) {
      setError('Failed to load SSO configuration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    if (field === 'client_secret') {
      setPasswordChanged(true)
    }
    setConfig({ ...config, [field]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const payload = { ...config }
      // Don't send password if it wasn't changed (still shows ***)
      if (!passwordChanged && payload.client_secret === '***') {
        delete payload.client_secret
      }
      
      await axios.put('/api/admin/sso-config', payload)
      setSuccess('SSO configuration saved successfully')
      setPasswordChanged(false)
      loadConfig()
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
          SSO Configuration
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
        SSO Configuration
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            SSO Status
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
            }
            label={config.enabled ? 'SSO Enabled' : 'SSO Disabled'}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {config.enabled 
            ? 'SSO authentication is active. Users can log in via SSO provider.'
            : 'SSO authentication is disabled. Users will use LDAP or local authentication.'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Provider Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="SSO Provider"
              value={config.provider}
              onChange={(e) => handleChange('provider', e.target.value)}
              margin="normal"
              disabled={!config.enabled}
            >
              <MenuItem value="oidc">OIDC (OpenID Connect)</MenuItem>
              <MenuItem value="saml">SAML 2.0</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Issuer URL"
              value={config.issuer_url}
              onChange={(e) => handleChange('issuer_url', e.target.value)}
              margin="normal"
              placeholder="https://auth.example.com/realms/myrealm"
              helperText="OIDC Issuer URL (used for discovery). Should end with /.well-known/openid-configuration"
              disabled={!config.enabled}
              error={!config.issuer_url && config.enabled}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Optional: Explicit Endpoints (leave empty to use discovery)
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Authorization Endpoint"
              value={config.authorization_endpoint}
              onChange={(e) => handleChange('authorization_endpoint', e.target.value)}
              margin="normal"
              placeholder="https://auth.example.com/authorize"
              helperText="OAuth2 authorization endpoint"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Token Endpoint"
              value={config.token_endpoint}
              onChange={(e) => handleChange('token_endpoint', e.target.value)}
              margin="normal"
              placeholder="https://auth.example.com/token"
              helperText="OAuth2 token endpoint"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="UserInfo Endpoint"
              value={config.userinfo_endpoint}
              onChange={(e) => handleChange('userinfo_endpoint', e.target.value)}
              margin="normal"
              placeholder="https://auth.example.com/userinfo"
              helperText="OIDC userinfo endpoint"
              disabled={!config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Client ID"
              value={config.client_id}
              onChange={(e) => handleChange('client_id', e.target.value)}
              margin="normal"
              placeholder="hlspg-portal"
              helperText="OIDC Client ID - Required"
              disabled={!config.enabled}
              error={!config.client_id && config.enabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Client Secret"
              type="password"
              value={config.client_secret}
              onChange={(e) => handleChange('client_secret', e.target.value)}
              margin="normal"
              placeholder={passwordChanged ? "Enter new secret" : "••••••••"}
              helperText="OAuth2/OIDC client secret"
              disabled={!config.enabled && !passwordChanged}
            />
            {originalConfig?.client_secret && !passwordChanged && (
              <Chip
                label="Secret is set"
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
              label="Redirect URI"
              value={config.redirect_uri}
              onChange={(e) => handleChange('redirect_uri', e.target.value)}
              margin="normal"
              placeholder="http://localhost:3000/api/auth/sso/callback"
              helperText="OAuth2 redirect URI - Required. Must be registered in your OIDC provider"
              disabled={!config.enabled}
              error={!config.redirect_uri && config.enabled}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Scopes"
              value={config.scopes}
              onChange={(e) => handleChange('scopes', e.target.value)}
              margin="normal"
              helperText="Space-separated OAuth2 scopes (e.g., 'openid profile email')"
              disabled={!config.enabled}
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {config.scopes.split(' ').filter(s => s).map((scope, idx) => (
                <Chip key={idx} label={scope} size="small" />
              ))}
            </Box>
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

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Configuration Notes
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul>
            <li><strong>Issuer URL</strong>: The base URL of your OIDC provider. The system will automatically discover endpoints from <code>/.well-known/openid-configuration</code></li>
            <li><strong>Explicit Endpoints</strong>: Optional. Only specify if you want to override discovery or if discovery is not available</li>
            <li><strong>Redirect URI</strong>: Must be registered in your OIDC provider. Example: <code>http://your-domain/api/auth/sso/callback</code></li>
            <li><strong>Client Secret</strong>: Stored securely and masked when displayed. Required for confidential clients</li>
            <li><strong>Scopes</strong>: Space-separated OAuth2 scopes. <code>openid</code> is required for OIDC</li>
            <li>SSO will be used for authentication when enabled, alongside LDAP</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  )
}

