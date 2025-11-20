import React, { useState, useEffect, useRef } from 'react'
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
  Tabs,
  Tab,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import LaunchIcon from '@mui/icons-material/Launch'
import LinkIcon from '@mui/icons-material/Link'
import VpnLockIcon from '@mui/icons-material/VpnLock'
import TerminalIcon from '@mui/icons-material/Terminal'
import axios from 'axios'
import { Link } from 'react-router-dom'
import Console from '../components/Console'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

// Snap threshold in pixels
const SNAP_THRESHOLD = 20
const GRID_SIZE = 20

const snapToGrid = (value) => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

const snapToEdges = (left, top, width, height) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Snap to left edge
  if (Math.abs(left) < SNAP_THRESHOLD) {
    left = 0
  }
  // Snap to right edge
  else if (Math.abs(left + width - viewportWidth) < SNAP_THRESHOLD) {
    left = viewportWidth - width
  }
  // Snap to top edge
  if (Math.abs(top) < SNAP_THRESHOLD) {
    top = 0
  }
  // Snap to bottom edge
  else if (Math.abs(top + height - viewportHeight) < SNAP_THRESHOLD) {
    top = viewportHeight - height
  }
  
  // Also snap to grid
  left = snapToGrid(left)
  top = snapToGrid(top)
  
  return { left, top }
}

export default function UserPortal() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState(null)
  const [inlineWindows, setInlineWindows] = useState({})
  const [draggingWindow, setDraggingWindow] = useState(null)
  const [resizingWindow, setResizingWindow] = useState(null)
  const [selectedConsoleType, setSelectedConsoleType] = useState({}) // Track selected console type per site
  const [iframeStatus, setIframeStatus] = useState({}) // Track iframe loading/error status per site
  const windowRefs = useRef({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const sitesRes = await axios.get('/api/sites')
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

  useEffect(() => {
    return () => {
      windowRefs.current = {}
    }
  }, [])

  const getInlineOptions = (site) => {
    return [
      site.inline_web_url && { value: 'web', label: 'Web', url: site.inline_web_url },
      site.inline_ssh_url && { value: 'ssh', label: 'SSH', url: site.inline_ssh_url },
      site.inline_vnc_url && { value: 'vnc', label: 'VNC', url: site.inline_vnc_url },
    ].filter(Boolean)
  }

  const toggleInlineWindow = (site, selectedType = null) => {
    const inlineOptions = getInlineOptions(site)
    if (inlineOptions.length === 0) {
      return
    }
    
    // Use selected type, existing tab, or first available
    const typeToUse = selectedType || 
                     selectedConsoleType[site.id] ||
                     (inlineWindows[site.id]?.tab && inlineOptions.some((opt) => opt.value === inlineWindows[site.id].tab)
                       ? inlineWindows[site.id].tab
                       : inlineOptions[0].value)
    
    setInlineWindows((prev) => {
      const existing = prev[site.id]
      if (existing?.active) {
        return { ...prev, [site.id]: { ...existing, active: false } }
      }
      return {
        ...prev,
        [site.id]: {
          active: true,
          tab: typeToUse,
          width: existing?.width || 600,
          height: existing?.height || site.inline_console_height || 480,
          top: existing?.top ?? 80,
          left: existing?.left ?? 80,
        },
      }
    })
    // Set loading state when opening window
    setIframeStatus((prev) => ({
      ...prev,
      [site.id]: 'loading'
    }))
  }
  
  const handleConsoleTypeChange = (siteId, newType) => {
    setSelectedConsoleType((prev) => ({
      ...prev,
      [siteId]: newType,
    }))
    // If window is already open, switch to the new type
    if (inlineWindows[siteId]?.active) {
      updateInlineWindowTab(siteId, newType)
    }
  }

  const updateInlineWindowTab = (siteId, newTab) => {
    setInlineWindows((prev) => ({
      ...prev,
      [siteId]: {
        ...prev[siteId],
        tab: newTab,
      },
    }))
    // Set loading state when switching tabs
    setIframeStatus((prev) => ({
      ...prev,
      [siteId]: 'loading'
    }))
  }

  const startDragWindow = (siteId, event) => {
    event.preventDefault()
    const win = inlineWindows[siteId]
    if (!win?.active) return
    setDraggingWindow({
      siteId,
      offsetX: event.clientX - win.left,
      offsetY: event.clientY - win.top,
    })
  }

  useEffect(() => {
    if (!draggingWindow) return
    const handleMouseMove = (event) => {
      setInlineWindows((prev) => {
        const win = prev[draggingWindow.siteId]
        if (!win?.active) return prev
        let newLeft = Math.max(0, event.clientX - draggingWindow.offsetX)
        let newTop = Math.max(0, event.clientY - draggingWindow.offsetY)
        
        // Apply snapping
        const snapped = snapToEdges(newLeft, newTop, win.width, win.height)
        newLeft = snapped.left
        newTop = snapped.top
        
        // Keep within viewport bounds
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - win.width))
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - win.height))
        
        if (newLeft === win.left && newTop === win.top) {
          return prev
        }
        return {
          ...prev,
          [draggingWindow.siteId]: {
            ...win,
            left: newLeft,
            top: newTop,
          },
        }
      })
    }
    const handleMouseUp = () => setDraggingWindow(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingWindow])
  
  // Handle window resizing with snap
  useEffect(() => {
    if (!resizingWindow) return
    
    const handleMouseMove = (event) => {
      setInlineWindows((prev) => {
        const win = prev[resizingWindow.siteId]
        if (!win?.active) return prev
        
        const deltaX = event.clientX - resizingWindow.startX
        const deltaY = event.clientY - resizingWindow.startY
        
        let newWidth = Math.max(300, resizingWindow.startWidth + deltaX)
        let newHeight = Math.max(200, resizingWindow.startHeight + deltaY)
        
        // Snap to grid
        newWidth = snapToGrid(newWidth)
        newHeight = snapToGrid(newHeight)
        
        // Keep within viewport
        const maxWidth = window.innerWidth - win.left
        const maxHeight = window.innerHeight - win.top
        newWidth = Math.min(newWidth, maxWidth)
        newHeight = Math.min(newHeight, maxHeight)
        
        if (newWidth === win.width && newHeight === win.height) {
          return prev
        }
        
        return {
          ...prev,
          [resizingWindow.siteId]: {
            ...win,
            width: newWidth,
            height: newHeight,
          },
        }
      })
    }
    
    const handleMouseUp = () => setResizingWindow(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingWindow])
  
  const startResize = (siteId, event) => {
    event.preventDefault()
    event.stopPropagation()
    const win = inlineWindows[siteId]
    if (!win?.active) return
    setResizingWindow({
      siteId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: win.width,
      startHeight: win.height,
    })
  }

  const setWindowRef = (siteId) => (node) => {
    if (!node) {
      delete windowRefs.current[siteId]
      return
    }
    windowRefs.current[siteId] = node
  }

  const closeInlineWindow = (siteId) => {
    setInlineWindows((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], active: false },
    }))
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
        Accessible Sites
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Button component={Link} to="/profile" variant="outlined" size="small">
          View Profile
        </Button>
        <Button component={Link} to="/credentials" variant="outlined" size="small">
          Manage Credentials
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            {sites.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No sites are currently available. Contact your administrator if you believe this is an error.
              </Alert>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {sites.map((site) => {
                  const hasProxy = !!site.proxy_url
                  const accessUrl = hasProxy ? site.proxy_url : site.url
                  const inlineOptions = getInlineOptions(site)
                  const instructionsText = site.inline_proxy_instructions_resolved || site.inline_proxy_instructions
                  
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
                            {site.console_enabled && (
                              <Chip
                                icon={<TerminalIcon />}
                                label={site.console_type === 'html5' ? 'HTML5 Console' : site.console_type === 'ssh' ? 'SSH Console' : 'Console'}
                                size="small"
                                color="secondary"
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

                            {site.requires_user_credential && (
                              <Alert severity="warning" sx={{ mb: 1.5 }}>
                                This site requires a {site.required_credential_type || 'credential'}. Upload it in the Credentials page.
                              </Alert>
                            )}

                            {(inlineOptions.length > 0 || site.inline_proxy_mode !== 'none' || instructionsText) && (
                              <Box sx={{ mt: 2 }}>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="subtitle1" gutterBottom>
                                  Inline Consoles
                                </Typography>
                                {(site.inline_proxy_mode !== 'none' || instructionsText) && (
                                  <Alert severity="info" sx={{ mb: 2 }}>
                                    {site.inline_proxy_mode !== 'none' && (
                                      <Box sx={{ mb: instructionsText ? 1 : 0 }}>
                                        Proxy Mode: <strong>{site.inline_proxy_mode}</strong>
                                        {site.inline_proxy_auth && site.inline_proxy_auth !== 'none' && ` · Auth: ${site.inline_proxy_auth}`}
                                      </Box>
                                    )}
                                    {instructionsText}
                                  </Alert>
                                )}
                                {inlineOptions.length > 0 && (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        {inlineOptions.length} inline endpoint{inlineOptions.length > 1 ? 's' : ''}
                                      </Typography>
                                    </Box>
                                    {inlineOptions.length > 1 && (
                                      <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <InputLabel>Select Console Type</InputLabel>
                                        <Select
                                          value={selectedConsoleType[site.id] || inlineOptions[0].value}
                                          label="Select Console Type"
                                          onChange={(e) => handleConsoleTypeChange(site.id, e.target.value)}
                                        >
                                          {inlineOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                              {option.label}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    )}
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => toggleInlineWindow(site)}
                                    >
                                      {inlineWindows[site.id]?.active ? 'Hide Inline Console' : 'Activate Inline Console'}
                                    </Button>
                                    {inlineWindows[site.id]?.active && (
                                      <Typography variant="caption" color="text.secondary">
                                        Drag the header to move. Drag the bottom-right corner to resize. Windows snap to edges and grid.
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
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
                            {site.console_enabled && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<TerminalIcon />}
                                onClick={() => {
                                  setSelectedSite(site)
                                  setConsoleOpen(true)
                                }}
                              >
                                Console
                              </Button>
                            )}
                          </Box>
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

      <Console
        open={consoleOpen}
        onClose={() => {
          setConsoleOpen(false)
          setSelectedSite(null)
        }}
        site={selectedSite}
      />
      {Object.entries(inlineWindows).map(([siteId, windowState]) => {
        if (!windowState?.active) return null
        const numericId = Number(siteId)
        const site = sites.find((s) => s.id === numericId)
        if (!site) return null
        const options = getInlineOptions(site)
        if (options.length === 0) return null
        const currentTab = windowState.tab && options.some((opt) => opt.value === windowState.tab)
          ? windowState.tab
          : options[0].value
        const activeOption = options.find((opt) => opt.value === currentTab) || options[0]
        return (
          <Box
            key={`inline-window-${siteId}`}
            ref={setWindowRef(numericId)}
            sx={{
              position: 'fixed',
              top: `${windowState.top}px`,
              left: `${windowState.left}px`,
              width: `${windowState.width}px`,
              height: `${windowState.height}px`,
              overflow: 'hidden',
              zIndex: 1500,
              pointerEvents: 'auto',
            }}
          >
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 6 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  cursor: 'move',
                }}
                onMouseDown={(event) => startDragWindow(numericId, event)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {site.name} — Inline Console
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" color="inherit" onClick={() => toggleInlineWindow(site)}>
                    {windowState.active ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="small" color="inherit" onClick={() => closeInlineWindow(numericId)}>
                    Close
                  </Button>
                </Box>
              </Box>
              <Tabs
                value={currentTab}
                onChange={(event, newValue) => updateInlineWindowTab(numericId, newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {options.map((option) => (
                  <Tab key={option.value} label={option.label} value={option.value} />
                ))}
              </Tabs>
              <Box sx={{ flex: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default', position: 'relative' }}>
                {activeOption?.url ? (
                  <>
                    {iframeStatus[numericId] === 'loading' && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    )}
                    {iframeStatus[numericId] === 'error' && (
                      <Alert severity="error" sx={{ m: 2 }}>
                        Failed to load inline console. Please check:
                        <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                          <li>The console URL is accessible and valid</li>
                          <li>The console supports being embedded in an iframe</li>
                          <li>There are no CORS or security restrictions blocking the connection</li>
                        </ul>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                          URL: {activeOption.url}
                        </Typography>
                      </Alert>
                    )}
                    <iframe
                      src={activeOption.url}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        border: 'none',
                        display: iframeStatus[numericId] === 'error' ? 'none' : 'block'
                      }}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-presentation"
                      title={`${activeOption.label} inline console for ${site.name}`}
                      onLoad={() => {
                        setIframeStatus((prev) => ({
                          ...prev,
                          [numericId]: 'loaded'
                        }))
                      }}
                      onError={() => {
                        setIframeStatus((prev) => ({
                          ...prev,
                          [numericId]: 'error'
                        }))
                      }}
                    />
                  </>
                ) : (
                  <Alert severity="error" sx={{ m: 2 }}>
                    Inline console URL not configured.
                  </Alert>
                )}
                {/* Resize handle */}
                <Box
                  onMouseDown={(e) => startResize(numericId, e)}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '20px',
                    height: '20px',
                    cursor: 'nwse-resize',
                    background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, transparent 60%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.2) 60%, transparent 60%)',
                    },
                  }}
                />
              </Box>
            </Paper>
          </Box>
        )
      })}
    </Container>
  )
}


