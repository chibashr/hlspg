import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material'
import axios from 'axios'
import { useTheme as useAppTheme } from '../contexts/ThemeContext'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function Login({ webappConfig }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [loginConfig, setLoginConfig] = useState({
    login_title: '',
    login_subtitle: '',
    login_description: '',
    logo_url: '',
    app_title: '',
  })
  const navigate = useNavigate()
  const muiTheme = useTheme()
  const { mode } = useAppTheme()
  
  const primaryColor = webappConfig?.primary_color || muiTheme.palette.primary.main
  const secondaryColor = webappConfig?.secondary_color || muiTheme.palette.secondary.main

  useEffect(() => {
    // Load login customization config
    axios.get('/api/admin/webapp-config/public')
      .then(response => {
        setLoginConfig({
          login_title: response.data.login_title || '',
          login_subtitle: response.data.login_subtitle || '',
          login_description: response.data.login_description || '',
          logo_url: response.data.logo_url || '',
          app_title: response.data.app_title || 'HLSPG Portal',
        })
      })
      .catch(() => {
        // Use defaults if config fails to load
        setLoginConfig({
          login_title: '',
          login_subtitle: '',
          login_description: '',
          logo_url: '',
          app_title: 'HLSPG Portal',
        })
      })
    
    // Check if setup is needed
    axios.get('/api/auth/setup/check')
      .then(response => {
        if (response.data.setup_required) {
          // No admin exists, redirect to setup
          navigate('/setup')
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        setChecking(false)
      })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      })
      
      if (response.data.ok) {
        // Redirect based on roles
        const roles = response.data.roles || []
        if (roles.includes('admin')) {
          navigate('/dashboard')
        } else {
          // Users without admin role go to portal
          // Portal access is allowed for all authenticated users
          navigate('/portal')
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  // Create gradient colors based on theme
  const gradientColors = mode === 'light'
    ? `${primaryColor} 0%, ${secondaryColor} 25%, ${primaryColor}66 50%, ${secondaryColor}66 75%, ${primaryColor} 100%`
    : `${primaryColor}CC 0%, ${secondaryColor}CC 25%, ${primaryColor}99 50%, ${secondaryColor}99 75%, ${primaryColor}CC 100%`

  if (checking) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${gradientColors})`,
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          '@keyframes gradient': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              textAlign: 'center',
              background: mode === 'light' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(30, 30, 30, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <CircularProgress sx={{ color: 'primary.main' }} />
            <Typography variant="body1" sx={{ mt: 2, color: 'text.primary' }}>
              Checking setup status...
            </Typography>
          </Paper>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${gradientColors})`,
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        px: { xs: 2, sm: 0 },
        py: { xs: 2, sm: 0 },
      }}
    >
      <Container maxWidth="sm" sx={{ width: '100%' }}>
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 3,
            background: mode === 'light'
              ? 'rgba(255, 255, 255, 0.95)'
              : 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === 'light'
              ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              : '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
          }}
        >
          {loginConfig.logo_url && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <img
                src={loginConfig.logo_url}
                alt="Logo"
                style={{ maxHeight: 80, maxWidth: 300 }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </Box>
          )}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 600,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2,
              textAlign: 'center',
            }}
          >
            {loginConfig.login_title || `${loginConfig.app_title} Login`}
          </Typography>
          {loginConfig.login_subtitle && (
            <Typography
              variant="subtitle1"
              sx={{
                mb: 2,
                textAlign: 'center',
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              {loginConfig.login_subtitle}
            </Typography>
          )}
          {loginConfig.login_description && (
            <Typography
              variant="body2"
              sx={{
                mb: 3,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              {loginConfig.login_description}
            </Typography>
          )}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${primaryColor}66`,
                },
                transition: 'all 0.3s ease',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Login
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  )
}

