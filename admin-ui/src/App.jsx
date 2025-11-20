import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeContextProvider } from './contexts/ThemeContext'
import UnifiedLayout from './components/UnifiedLayout'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import UserPortal from './pages/UserPortal'
import Profile from './pages/Profile'
import Credentials from './pages/Credentials'
import LDAPSetup from './pages/LDAPSetup'
import LDAPConfig from './pages/LDAPConfig'
import RoleManagement from './pages/RoleManagement'
import SiteManagement from './pages/SiteManagement'
import UserManagement from './pages/UserManagement'
import AuditLog from './pages/AuditLog'
import WebAppConfig from './pages/WebAppConfig'
import SSOConfig from './pages/SSOConfig'
import CertificateManagement from './pages/CertificateManagement'
import axios from 'axios'

function App() {
  const [webappConfig, setWebappConfig] = useState(null)

  useEffect(() => {
    // Load webapp config on mount
    axios.get('/api/admin/webapp-config/public')
      .then(response => {
        const config = response.data
        setWebappConfig(config)
        
        // Update document title
        if (config.page_title) {
          document.title = config.page_title
        }
        
        // Update favicon if provided
        if (config.favicon_url) {
          const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
          link.type = 'image/x-icon'
          link.rel = 'shortcut icon'
          link.href = config.favicon_url
          document.getElementsByTagName('head')[0].appendChild(link)
        }
      })
      .catch(err => {
        console.error('Failed to load webapp config:', err)
      })
  }, [])

  return (
    <ThemeContextProvider webappConfig={webappConfig}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login webappConfig={webappConfig} />} />
          <Route path="/" element={<UnifiedLayout webappConfig={webappConfig} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="portal" element={<UserPortal />} />
            <Route path="profile" element={<Profile />} />
            <Route path="credentials" element={<Credentials />} />
            <Route path="ldap" element={<LDAPSetup />} />
            <Route path="ldap-config" element={<LDAPConfig />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="sites" element={<SiteManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="webapp-config" element={<WebAppConfig />} />
            <Route path="sso-config" element={<SSOConfig />} />
            <Route path="certificates" element={<CertificateManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContextProvider>
  )
}

export default App

