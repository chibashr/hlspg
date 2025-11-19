import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SecurityIcon from '@mui/icons-material/Security'
import GroupIcon from '@mui/icons-material/Group'
import WebIcon from '@mui/icons-material/Web'
import PeopleIcon from '@mui/icons-material/People'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import axios from 'axios'
import { useTheme } from '../contexts/ThemeContext'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

const drawerWidth = 240

// Admin-only menu items (paths are relative, will be prefixed based on route)
const adminMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard' },
  { text: 'LDAP Setup', icon: <SecurityIcon />, path: 'ldap' },
  { text: 'LDAP Config', icon: <SecurityIcon />, path: 'ldap-config' },
  { text: 'Role Management', icon: <GroupIcon />, path: 'roles' },
  { text: 'Site Management', icon: <WebIcon />, path: 'sites' },
  { text: 'User Management', icon: <PeopleIcon />, path: 'users' },
  { text: 'Audit Log', icon: <HistoryIcon />, path: 'audit' },
  { text: 'Web App Config', icon: <SettingsIcon />, path: 'webapp-config' },
  { text: 'SSO Config', icon: <VpnKeyIcon />, path: 'sso-config' },
]

// User menu items (accessible to all authenticated users)
const userMenuItems = [
  { text: 'Portal', icon: <DashboardIcon />, path: 'portal' },
]

export default function UnifiedLayout({ webappConfig }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, toggleMode, theme } = useTheme()

  useEffect(() => {
    // Check authentication
    axios.get('/api/auth/me')
      .then(response => {
        const userData = response.data.user
        const userRoles = response.data.roles || []
        
        setUser(userData)
        setRoles(userRoles)
        
        // Determine if user is admin
        const isAdmin = userRoles.includes('admin') || userData.is_local_admin
        
        // Handle routing based on path and admin status
          // Admin routes - redirect non-admins to portal
        const adminRoutes = ['/dashboard', '/ldap', '/ldap-config', '/roles', '/sites', '/users', '/audit', '/webapp-config', '/sso-config']
        const isAdminRoute = adminRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'))
        
        if (isAdminRoute && !isAdmin) {
            navigate('/portal')
            return
        }
      })
      .catch(() => {
        // Check if setup is needed first
        axios.get('/api/auth/setup/check')
          .then(response => {
            if (response.data.setup_required) {
              navigate('/setup')
            } else {
              navigate('/login')
            }
          })
          .catch(() => {
            navigate('/login')
          })
      })
  }, [navigate, location.pathname])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    axios.post('/api/auth/logout')
      .then(() => {
        navigate('/login')
      })
      .catch(() => {
        navigate('/login')
      })
  }

  if (!user) {
    return null // Will redirect
  }

  const isAdmin = roles.includes('admin') || user.is_local_admin
  
  // Build menu items with unified paths (no prefix needed)
  const menuItems = isAdmin ? adminMenuItems.map(item => ({
    ...item,
    fullPath: `/${item.path}`
  })) : userMenuItems.map(item => ({
    ...item,
    fullPath: `/${item.path}`
  }))

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          background: mode === 'light'
            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
          color: '#fff',
        }}
      >
        {webappConfig?.logo_url ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <img
              src={webappConfig.logo_url}
              alt="Logo"
              style={{ maxHeight: 32, maxWidth: 120 }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <Typography variant="h6" noWrap component="div" sx={{ color: '#fff' }}>
              {webappConfig.app_title || 'HLSPG'}
            </Typography>
          </Box>
        ) : (
          <Typography variant="h6" noWrap component="div" sx={{ color: '#fff' }}>
            {webappConfig?.app_title || 'HLSPG'}
          </Typography>
        )}
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.fullPath || 
                            location.pathname.startsWith(item.fullPath + '/') ||
                            (item.path === 'dashboard' && location.pathname === '/')
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isSelected}
                onClick={() => navigate(item.fullPath)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          {webappConfig?.logo_url ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <img
                src={webappConfig.logo_url}
                alt="Logo"
                style={{ maxHeight: 40, maxWidth: 150 }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <Typography variant="h6" noWrap component="div">
                {webappConfig.app_title || 'HLSPG Portal'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {webappConfig?.app_title || 'Home Lab Single Pane of Glass'}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, mr: 1 }}>
              {user.display_name || user.uid}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {(user.display_name || user.uid || 'U').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {mode === 'light' ? (
                    <Brightness4Icon sx={{ mr: 1 }} />
                  ) : (
                    <Brightness7Icon sx={{ mr: 1 }} />
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mode === 'dark'}
                        onChange={toggleMode}
                        size="small"
                      />
                    }
                    label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    sx={{ m: 0, flex: 1 }}
                  />
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              zIndex: (theme) => theme.zIndex.drawer,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          mt: { xs: '56px', sm: '64px' },
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        }}
      >
        <Outlet />
      </Box>
      {webappConfig?.footer_text && (
        <Box
          component="footer"
          sx={{
            py: 2,
            px: 2,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800],
          }}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            {webappConfig.footer_text}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

