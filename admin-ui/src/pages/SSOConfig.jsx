import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import axios from 'axios'

export default function SSOConfig() {
  const [accountSettingsUrl, setAccountSettingsUrl] = useState('')
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
      const response = await axios.get('/api/admin/sso-config')
      setAccountSettingsUrl(response.data.account_settings_url || '')
    } catch (err) {
      setError('Failed to load SSO configuration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      await axios.put('/api/admin/sso-config', {
        account_settings_url: accountSettingsUrl
      })
      setSuccess('SSO configuration saved successfully')
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          SSO Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure a URL to your SSO account settings page. Users will see a button in their profile to access this page.
        </Typography>
        
        <TextField
          fullWidth
          label="SSO Account Settings URL"
          value={accountSettingsUrl}
          onChange={(e) => setAccountSettingsUrl(e.target.value)}
          margin="normal"
          placeholder="https://sso.example.com/account/settings"
          helperText="Enter the URL where users can manage their SSO account settings"
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
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
