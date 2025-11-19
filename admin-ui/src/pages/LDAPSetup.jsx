import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import axios from 'axios'
import { extractCNFromDN } from '../utils/ldap'

export default function LDAPSetup() {
  const [testConnectionLoading, setTestConnectionLoading] = useState(false)
  const [testBindLoading, setTestBindLoading] = useState(false)
  const [findUserLoading, setFindUserLoading] = useState(false)
  const [testAuthLoading, setTestAuthLoading] = useState(false)
  
  const [connectionResult, setConnectionResult] = useState(null)
  const [bindResult, setBindResult] = useState(null)
  const [userResult, setUserResult] = useState(null)
  const [authResult, setAuthResult] = useState(null)
  
  const [testUsername, setTestUsername] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [findUsername, setFindUsername] = useState('')

  const testConnection = async () => {
    setTestConnectionLoading(true)
    setConnectionResult(null)
    try {
      const response = await axios.get('/api/admin/ldap/test')
      setConnectionResult({ success: true, message: response.data.message })
    } catch (err) {
      setConnectionResult({ 
        success: false, 
        error: err.response?.data?.error || 'Test failed',
        details: err.response?.data 
      })
    } finally {
      setTestConnectionLoading(false)
    }
  }

  const testBind = async () => {
    setTestBindLoading(true)
    setBindResult(null)
    try {
      const response = await axios.post('/api/admin/ldap/test-bind', {})
      setBindResult({ success: true, message: response.data.message })
    } catch (err) {
      setBindResult({ 
        success: false, 
        error: err.response?.data?.error || 'Bind test failed',
        details: err.response?.data 
      })
    } finally {
      setTestBindLoading(false)
    }
  }

  const findUser = async () => {
    if (!findUsername) {
      setUserResult({ success: false, error: 'Username is required' })
      return
    }
    
    setFindUserLoading(true)
    setUserResult(null)
    try {
      const response = await axios.post('/api/admin/ldap/find-user', {
        username: findUsername
      })
      setUserResult({ success: true, user: response.data.user })
    } catch (err) {
      setUserResult({ 
        success: false, 
        error: err.response?.data?.error || 'User lookup failed',
        details: err.response?.data 
      })
    } finally {
      setFindUserLoading(false)
    }
  }

  const testAuth = async () => {
    if (!testUsername || !testPassword) {
      setAuthResult({ success: false, error: 'Username and password are required' })
      return
    }
    
    setTestAuthLoading(true)
    setAuthResult(null)
    try {
      const response = await axios.post('/api/admin/ldap/test-auth', {
        username: testUsername,
        password: testPassword
      })
      setAuthResult({ success: true, user: response.data.user, message: response.data.message })
    } catch (err) {
      setAuthResult({ 
        success: false, 
        error: err.response?.data?.error || 'Authentication test failed',
        details: err.response?.data 
      })
    } finally {
      setTestAuthLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        LDAP Setup & Testing
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Connection Test
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test TLS handshake and certificate verification
            </Typography>
            <Button
              variant="contained"
              onClick={testConnection}
              disabled={testConnectionLoading}
              sx={{ mb: 2 }}
            >
              {testConnectionLoading ? <CircularProgress size={24} /> : 'Test Connection'}
            </Button>
            {connectionResult && (
              <Alert severity={connectionResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                {connectionResult.success ? connectionResult.message : connectionResult.error}
                {connectionResult.details && (
                  <Box component="pre" sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {JSON.stringify(connectionResult.details, null, 2)}
                  </Box>
                )}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Service Account Bind Test
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test binding with configured service account
            </Typography>
            <Button
              variant="contained"
              onClick={testBind}
              disabled={testBindLoading}
              sx={{ mb: 2 }}
            >
              {testBindLoading ? <CircularProgress size={24} /> : 'Test Bind'}
            </Button>
            {bindResult && (
              <Alert severity={bindResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                {bindResult.success ? bindResult.message : bindResult.error}
                {bindResult.details && (
                  <Box component="pre" sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {JSON.stringify(bindResult.details, null, 2)}
                  </Box>
                )}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Find User
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test user lookup and show groups
            </Typography>
            <TextField
              fullWidth
              label="Username"
              value={findUsername}
              onChange={(e) => setFindUsername(e.target.value)}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={findUser}
              disabled={findUserLoading || !findUsername}
            >
              {findUserLoading ? <CircularProgress size={24} /> : 'Find User'}
            </Button>
            {userResult && (
              <Alert severity={userResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                {userResult.success ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>DN:</strong> {userResult.user.dn}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>CN:</strong> {userResult.user.cn}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Email:</strong> {userResult.user.mail || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Groups:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {userResult.user.memberOf?.map((group, idx) => {
                        const groupName = extractCNFromDN(group, 30)
                        return (
                          <Chip
                            key={idx}
                            label={groupName}
                            size="small"
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
                    </Box>
                  </Box>
                ) : (
                  userResult.error
                )}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Simulate a real login
            </Typography>
            <TextField
              fullWidth
              label="Username"
              value={testUsername}
              onChange={(e) => setTestUsername(e.target.value)}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={testAuth}
              disabled={testAuthLoading || !testUsername || !testPassword}
            >
              {testAuthLoading ? <CircularProgress size={24} /> : 'Test Authentication'}
            </Button>
            {authResult && (
              <Alert severity={authResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                {authResult.success ? (
                  <Box>
                    <Typography variant="body2">{authResult.message}</Typography>
                    {authResult.user && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Groups:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {authResult.user.memberOf?.length > 0 ? (
                            authResult.user.memberOf.map((group, idx) => {
                              const groupName = extractCNFromDN(group, 30)
                              return (
                                <Chip
                                  key={idx}
                                  label={groupName}
                                  size="small"
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
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary">None</Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  authResult.error
                )}
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
