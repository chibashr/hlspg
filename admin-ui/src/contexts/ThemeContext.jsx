import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeContextProvider')
  }
  return context
}

export const ThemeContextProvider = ({ children, webappConfig }) => {
  const [mode, setMode] = useState(() => {
    // Load theme preference from localStorage
    const savedMode = localStorage.getItem('themeMode')
    return savedMode || 'light'
  })

  const [webappColors, setWebappColors] = useState({
    primary: '#1976d2',
    secondary: '#dc004e',
  })

  // Update colors when webapp config changes
  useEffect(() => {
    if (webappConfig) {
      setWebappColors({
        primary: webappConfig.primary_color || '#1976d2',
        secondary: webappConfig.secondary_color || '#dc004e',
      })
    }
  }, [webappConfig])

  // Save theme mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode)
  }, [mode])

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const setThemeMode = (newMode) => {
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode)
    }
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: webappColors.primary,
            light: mode === 'light' 
              ? `${webappColors.primary}33` 
              : `${webappColors.primary}66`,
            dark: mode === 'light'
              ? webappColors.primary
              : `${webappColors.primary}CC`,
          },
          secondary: {
            main: webappColors.secondary,
            light: mode === 'light'
              ? `${webappColors.secondary}33`
              : `${webappColors.secondary}66`,
            dark: mode === 'light'
              ? webappColors.secondary
              : `${webappColors.secondary}CC`,
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: mode === 'light'
                  ? `linear-gradient(135deg, ${webappColors.primary} 0%, ${webappColors.secondary} 100%)`
                  : `linear-gradient(135deg, ${webappColors.primary}CC 0%, ${webappColors.secondary}CC 100%)`,
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: mode === 'light' 
                  ? '1px solid rgba(0, 0, 0, 0.12)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 600,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: mode === 'light'
                  ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
              },
            },
          },
        },
      }),
    [mode, webappColors]
  )

  const value = {
    mode,
    toggleMode,
    setThemeMode,
    theme,
  }

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
    </ThemeContext.Provider>
  )
}

