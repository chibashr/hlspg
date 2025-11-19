import React, { useState, useEffect } from 'react'
import { Typography, Paper, Grid, Box, Card, CardContent } from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import WebIcon from '@mui/icons-material/Web'
import SecurityIcon from '@mui/icons-material/Security'
import HistoryIcon from '@mui/icons-material/History'
import axios from 'axios'

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    sites: 0,
    roleMappings: 0,
    auditLogs: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [usersRes, sitesRes, mappingsRes, auditRes] = await Promise.all([
        axios.get('/api/admin/users').catch(() => ({ data: { users: [] } })),
        axios.get('/api/admin/sites').catch(() => ({ data: { sites: [] } })),
        axios.get('/api/admin/role-mappings').catch(() => ({ data: { mappings: [] } })),
        axios.get('/api/admin/audit?limit=1').catch(() => ({ data: { total: 0 } })),
      ])
      
      setStats({
        users: usersRes.data.users?.length || 0,
        sites: sitesRes.data.sites?.length || 0,
        roleMappings: mappingsRes.data.mappings?.length || 0,
        auditLogs: auditRes.data.total || 0,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Users</Typography>
              </Box>
              <Typography variant="h4">{stats.users}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WebIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Sites</Typography>
              </Box>
              <Typography variant="h4">{stats.sites}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Role Mappings</Typography>
              </Box>
              <Typography variant="h4">{stats.roleMappings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HistoryIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Audit Events</Typography>
              </Box>
              <Typography variant="h4">{stats.auditLogs}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome to HLSPG
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Home Lab Single Pane of Glass Administration Portal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Use the navigation menu to manage LDAP configuration, roles, sites, users, and view audit logs.
        </Typography>
      </Paper>
    </Box>
  )
}
