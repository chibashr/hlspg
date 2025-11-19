import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material'

export default function CredentialPrompt({ open, onClose, onConnect, site, hasSavedCredentials = false }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saveCredentials, setSaveCredentials] = useState(false)
  const [useSaved, setUseSaved] = useState(hasSavedCredentials)
  const [error, setError] = useState('')

  useEffect(() => {
    if (site?.ssh_path) {
      const sshPath = site.ssh_path
      if (sshPath.includes('@')) {
        const [user] = sshPath.split('@')
        setUsername(user || '')
      }
    }
    setUseSaved(hasSavedCredentials)
  }, [site, hasSavedCredentials])

  const handleConnect = () => {
    if (!username || (!password && !useSaved)) {
      setError('Username and password are required')
      return
    }

    onConnect({
      username: username.trim(),
      password: useSaved ? null : password,
      saveCredentials,
      useSaved,
    })
    handleClose()
  }

  const handleClose = () => {
    setError('')
    setPassword('')
    setSaveCredentials(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        SSH Connection Credentials
        {site && <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
          {site.name}
        </Typography>}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          
          {hasSavedCredentials && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={useSaved}
                  onChange={(e) => setUseSaved(e.target.checked)}
                />
              }
              label="Use saved credentials"
            />
          )}

          {!useSaved && (
            <>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={saveCredentials}
                    onChange={(e) => setSaveCredentials(e.target.checked)}
                  />
                }
                label="Save these credentials to my account?"
              />
              {saveCredentials && (
                <Alert severity="info" sx={{ mt: -1 }}>
                  Your password will be encrypted and stored securely. You can manage saved credentials in the Credentials section.
                </Alert>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConnect} variant="contained" disabled={!username || (!password && !useSaved)}>
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  )
}

