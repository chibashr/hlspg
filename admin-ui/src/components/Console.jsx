import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import CloseIcon from '@mui/icons-material/Close'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { io } from 'socket.io-client'
import CredentialPrompt from './CredentialPrompt'
import axios from 'axios'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export default function Console({ open, onClose, site, openInNewTab = false }) {
  const [fullscreen, setFullscreen] = useState(false)
  const [sshHost, setSshHost] = useState('')
  const [sshPort, setSshPort] = useState('22')
  const [sshUsername, setSshUsername] = useState('')
  const [sshConnecting, setSshConnecting] = useState(false)
  const [sshError, setSshError] = useState('')
  const [socket, setSocket] = useState(null)
  const [connectionId, setConnectionId] = useState(null)
  const [showCredentialPrompt, setShowCredentialPrompt] = useState(false)
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false)
  const terminalRef = useRef(null)
  const terminal = useRef(null)
  const fitAddon = useRef(null)
  const iframeRef = useRef(null)

  // Parse SSH path from site data
  useEffect(() => {
    if (site?.ssh_path && site.console_type === 'ssh') {
      const sshPath = site.ssh_path
      // Parse user@host or host
      if (sshPath.includes('@')) {
        const [user, hostPart] = sshPath.split('@')
        const [host, port] = hostPart.split(':')
        setSshUsername(user || '')
        setSshHost(host || '')
        setSshPort(port || '22')
      } else {
        const [host, port] = sshPath.split(':')
        setSshHost(host || '')
        setSshPort(port || '22')
      }
    }
  }, [site])

  // Check for saved credentials
  useEffect(() => {
    const checkSavedCredentials = async () => {
      if (site?.id && site?.console_type === 'ssh') {
        try {
          const res = await axios.get('/api/credentials')
          const credentials = res.data.credentials || []
          const hasPassword = credentials.some(
            cred => cred.credential_type === 'password' &&
            (cred.associated_site_ids || []).includes(site.id)
          )
          setHasSavedCredentials(hasPassword)
        } catch (err) {
          // Ignore errors
        }
      }
    }
    if (open && site?.console_type === 'ssh') {
      checkSavedCredentials()
    }
  }, [open, site])

  // Initialize terminal for SSH
  useEffect(() => {
    if (open && site?.console_type === 'ssh' && terminalRef.current && !terminal.current) {
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
      })
      fitAddon.current = new FitAddon()
      terminal.current.loadAddon(fitAddon.current)
      terminal.current.open(terminalRef.current)
      fitAddon.current.fit()

      // Handle window resize
      const handleResize = () => {
        if (fitAddon.current) {
          fitAddon.current.fit()
        }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [open, site])

  // Cleanup terminal and socket on close
  useEffect(() => {
    if (!open) {
      if (socket) {
        if (connectionId) {
          socket.emit('ssh_disconnect', { connection_id: connectionId })
        }
        socket.disconnect()
        setSocket(null)
      }
      setConnectionId(null)
      if (terminal.current) {
        terminal.current.dispose()
        terminal.current = null
        fitAddon.current = null
      }
      setSshError('')
      setSshConnecting(false)
      setShowCredentialPrompt(false)
    }
  }, [open, socket, connectionId])

  const handleSshConnect = () => {
    if (!sshHost || !sshUsername) {
      setSshError('Host and username are required')
      return
    }

    // Show credential prompt
    setShowCredentialPrompt(true)
  }

  const handleCredentialSubmit = async (credentials) => {
    setShowCredentialPrompt(false)
    setSshConnecting(true)
    setSshError('')

    // Create SocketIO connection
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    newSocket.on('connect', () => {
      // Send SSH connection request
      newSocket.emit('ssh_connect', {
        site_id: site?.id,
        host: sshHost,
        port: parseInt(sshPort) || 22,
        username: credentials.username,
        password: credentials.password,
        use_saved: credentials.useSaved,
        save_credentials: credentials.saveCredentials,
      })
    })

    newSocket.on('connected', (data) => {
      setSshConnecting(false)
      setConnectionId(data.connection_id)
      setSocket(newSocket)
      if (terminal.current) {
        terminal.current.write('\r\n\x1b[32mConnected to SSH server\x1b[0m\r\n')
      }
    })

    newSocket.on('output', (data) => {
      if (terminal.current && data.data) {
        terminal.current.write(data.data)
      }
    })

    newSocket.on('error', (data) => {
      setSshError(data.message || 'Connection failed')
      setSshConnecting(false)
      if (terminal.current) {
        terminal.current.write(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`)
      }
      newSocket.disconnect()
      setSocket(null)
    })

    newSocket.on('disconnected', (data) => {
      if (terminal.current) {
        terminal.current.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n')
      }
      setSocket(null)
      setConnectionId(null)
    })

    newSocket.on('disconnect', () => {
      setSocket(null)
      setConnectionId(null)
    })

    setSocket(newSocket)
  }

  // Handle terminal input
  useEffect(() => {
    if (terminal.current && socket && connectionId) {
      const dataHandler = (data) => {
        socket.emit('ssh_input', {
          connection_id: connectionId,
          input: data,
        })
      }
      terminal.current.onData(dataHandler)
      return () => {
        if (terminal.current) {
          terminal.current.offData(dataHandler)
        }
      }
    }
  }, [socket, connectionId])

  const handleFullscreen = () => {
    if (!fullscreen) {
      if (iframeRef.current?.requestFullscreen) {
        iframeRef.current.requestFullscreen()
      } else if (iframeRef.current?.webkitRequestFullscreen) {
        iframeRef.current.webkitRequestFullscreen()
      } else if (iframeRef.current?.mozRequestFullScreen) {
        iframeRef.current.mozRequestFullScreen()
      } else if (iframeRef.current?.msRequestFullscreen) {
        iframeRef.current.msRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    }
    setFullscreen(!fullscreen)
  }

  const handleOpenInNewTab = () => {
    if (site.console_type === 'html5' && site.console_url) {
      window.open(site.console_url, '_blank', 'noopener,noreferrer')
    } else if (site.console_type === 'ssh') {
      // For SSH, open a new window with the console
      const newWindow = window.open('', '_blank', 'width=1200,height=800')
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SSH Console - ${site.name}</title>
              <style>
                body { margin: 0; padding: 0; background: #1e1e1e; }
                #terminal { width: 100vw; height: 100vh; }
              </style>
            </head>
            <body>
              <div id="terminal"></div>
              <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
              <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
              <script>
                const term = new Terminal({ cursorBlink: true, fontSize: 14, fontFamily: 'monospace' });
                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);
                term.open(document.getElementById('terminal'));
                fitAddon.fit();
                term.write('\\r\\n\\x1b[31mSSH console requires a WebSocket proxy server.\\x1b[0m\\r\\n');
                term.write('\\r\\nPlease configure a WebSocket proxy for SSH connections.\\r\\n');
              </script>
            </body>
          </html>
        `)
      }
    }
  }

  if (!site || !site.console_enabled) {
    return null
  }

  // If opening in new tab, handle it immediately
  if (openInNewTab) {
    handleOpenInNewTab()
    onClose()
    return null
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        fullWidth
        fullScreen={fullscreen}
        PaperProps={{
          sx: {
            width: '90vw',
            height: '90vh',
            maxWidth: 'none',
            maxHeight: 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              Console - {site.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({site.console_type === 'html5' ? 'HTML5' : 'SSH'})
            </Typography>
          </Box>
          <Box>
            {site.console_type === 'html5' && (
              <IconButton onClick={handleFullscreen} size="small" sx={{ mr: 1 }}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {site.console_type === 'html5' ? (
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {site.console_url ? (
                <iframe
                  ref={iframeRef}
                  src={site.console_url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  title={`Console for ${site.name}`}
                />
              ) : (
                <Alert severity="error" sx={{ m: 2 }}>
                  Console URL not configured for this site.
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {!socket || !connectionId ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    SSH Connection
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Click Connect to establish an SSH connection. You will be prompted for credentials.
                  </Alert>
                  {sshError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {sshError}
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Host: {sshHost || 'Not configured'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Port: {sshPort || '22'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Username: {sshUsername || 'Not configured'}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleSshConnect}
                      disabled={sshConnecting || !sshHost || !sshUsername}
                      startIcon={sshConnecting ? <CircularProgress size={20} /> : null}
                    >
                      {sshConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: '#1e1e1e',
                  }}
                >
                  <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOpenInNewTab}>
            Open in New Tab
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <CredentialPrompt
        open={showCredentialPrompt}
        onClose={() => setShowCredentialPrompt(false)}
        onConnect={handleCredentialSubmit}
        site={site}
        hasSavedCredentials={hasSavedCredentials}
      />
    </>
  )
}
