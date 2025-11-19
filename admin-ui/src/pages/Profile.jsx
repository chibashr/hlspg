import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import SecurityIcon from '@mui/icons-material/Security'
import GroupIcon from '@mui/icons-material/Group'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import LaunchIcon from '@mui/icons-material/Launch'
import axios from 'axios'
import { extractCNFromDN } from '../utils/ldap'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await axios.get('/api/profile')
      setProfile(response.data)
    } catch (err) {
      console.error('Failed to load profile:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load profile'
      setError(errorMessage)
      
      if (err.response?.status === 401) {
        return
      }
    } finally {
      setLoading(false)
    }
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

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    )
  }

  if (!profile) {
    return null
  }

  const user = profile.user || {}
  const displayName = user.display_name || user.uid || 'User'
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.uid?.charAt(0).toUpperCase() || 'U'

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <PersonIcon sx={{ fontSize: 40 }} color="primary" />
          <Typography variant="h4" component="h1">
            My Profile
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          View your account information, roles, and group memberships
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`
                  : `linear-gradient(135deg, ${theme.palette.primary.dark}20 0%, ${theme.palette.secondary.dark}20 100%)`,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {user.uid}
                  </Typography>
                  {user.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                  <Chip
                    icon={<SecurityIcon />}
                    label={user.auth_type || 'Local'}
                    color={user.auth_type === 'LDAP' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                  {user.is_local_admin && (
                    <Chip
                      icon={<AdminPanelSettingsIcon />}
                      label="Administrator"
                      color="secondary"
                      sx={{ mt: 1 }}
                    />
                  )}
                  {profile.sso_account_settings_url && (
                    <Button
                      variant="outlined"
                      startIcon={<SettingsIcon />}
                      endIcon={<LaunchIcon />}
                      href={profile.sso_account_settings_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1 }}
                    >
                      Manage SSO Account
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AccountCircleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Account Information
                </Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Username"
                    secondary={user.uid || 'N/A'}
                  />
                </ListItem>
                {user.display_name && (
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Display Name"
                      secondary={user.display_name}
                    />
                  </ListItem>
                )}
                {user.email && (
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={user.email}
                    />
                  </ListItem>
                )}
                {user.last_login && (
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Login"
                      secondary={new Date(user.last_login).toLocaleString()}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Roles & Permissions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AdminPanelSettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Roles & Permissions
                </Typography>
              </Box>
              {profile.roles && profile.roles.length > 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    You have the following roles assigned:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {profile.roles.map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        color={role === 'admin' ? 'secondary' : 'primary'}
                        variant={role === 'admin' ? 'filled' : 'outlined'}
                        icon={role === 'admin' ? <AdminPanelSettingsIcon /> : undefined}
                        sx={{ fontSize: '0.875rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Alert severity="info">
                  No roles assigned. Contact your administrator if you need access.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* LDAP Groups */}
        {profile.groups && profile.groups.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    LDAP Group Memberships
                  </Typography>
                  <Chip
                    label={`${profile.groups.length} group${profile.groups.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You are a member of the following LDAP groups:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile.groups.map((group, idx) => {
                    const groupName = extractCNFromDN(group, 50)
                    return (
                      <Chip
                        key={idx}
                        label={groupName}
                        variant="outlined"
                        sx={{
                          maxWidth: '100%',
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 300,
                          },
                        }}
                      />
                    )
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  )
}

