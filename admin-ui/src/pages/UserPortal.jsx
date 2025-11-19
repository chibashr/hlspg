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
} from '@mui/material'
import LaunchIcon from '@mui/icons-material/Launch'
import PersonIcon from '@mui/icons-material/Person'
import LinkIcon from '@mui/icons-material/Link'
import VpnLockIcon from '@mui/icons-material/VpnLock'
import axios from 'axios'
import { extractCNFromDN } from '../utils/ldap'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function UserPortal() {
  const [profile, setProfile] = useState(null)
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [profileRes, sitesRes] = await Promise.all([
        axios.get('/api/profile'),
        axios.get('/api/sites'),
      ])
      setProfile(profileRes.data)
      setSites(sitesRes.data.sites || [])
    } catch (err) {
      console.error('Failed to load portal data:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load data'
      setError(errorMessage)
      
      // If it's an authentication error, redirect to login
      if (err.response?.status === 401) {
        // Let UserLayout handle the redirect
        return
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {profile?.user?.display_name || profile?.user?.uid}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Profile</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              <strong>Username:</strong> {profile?.user?.uid}
            </Typography>
            {profile?.user?.email && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Email:</strong> {profile?.user?.email}
              </Typography>
            )}
            {profile?.user?.auth_type && (
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={profile.user.auth_type} 
                  size="small" 
                  color={profile.user.auth_type === 'LDAP' ? 'primary' : 'default'}
                />
              </Box>
            )}
            {profile?.roles && profile.roles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Roles:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {profile.roles.map((role) => (
                    <Chip key={role} label={role} size="small" />
                  ))}
                </Box>
              </Box>
            )}
            {profile?.groups && profile.groups.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>LDAP Groups ({profile.groups.length}):</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {profile.groups.map((group, idx) => {
                    const groupName = extractCNFromDN(group, 30)
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
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sites Card */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Accessible Sites
            </Typography>
            {sites.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No sites are currently available. Contact your administrator if you believe this is an error.
              </Alert>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {sites.map((site) => {
                  const hasProxy = !!site.proxy_url
                  const accessUrl = hasProxy ? site.proxy_url : site.url
                  
                  return (
                    <Grid item xs={12} sm={6} key={site.id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6" component="h3">
                              {site.name}
                            </Typography>
                            {hasProxy && (
                              <Chip
                                icon={<VpnLockIcon />}
                                label="Proxied"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          
                          {site.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                              {site.description}
                            </Typography>
                          )}
                          
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ mb: 1.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                Site URL:
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all',
                                  color: 'primary.main'
                                }}
                              >
                                {site.url}
                              </Typography>
                            </Box>
                            
                            {hasProxy && (
                              <Box sx={{ mb: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  Proxy Endpoint:
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                    color: 'primary.main'
                                  }}
                                >
                                  {site.proxy_url}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Access via proxy for secure connection
                                </Typography>
                              </Box>
                            )}
                            
                            {site.access_methods && site.access_methods.length > 0 && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  Access Methods:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {site.access_methods.map((method) => (
                                    <Chip
                                      key={method}
                                      label={method}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            {site.sign_on_method && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  Sign-On Method:
                                </Typography>
                                <Chip
                                  label={site.sign_on_method}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={hasProxy ? <VpnLockIcon /> : <LaunchIcon />}
                            href={accessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {hasProxy ? 'Open via Proxy' : 'Open Site'}
                          </Button>
                          {hasProxy && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<LinkIcon />}
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Direct access (bypass proxy)"
                            >
                              Direct
                            </Button>
                          )}
                        </CardActions>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}


