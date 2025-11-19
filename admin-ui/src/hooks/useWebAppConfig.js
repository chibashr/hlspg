import { useState, useEffect } from 'react'
import axios from 'axios'

export function useWebAppConfig() {
  const [config, setConfig] = useState({
    app_title: 'HLSPG Portal',
    page_title: 'Home Lab Single Pane of Glass',
    primary_color: '#1976d2',
    secondary_color: '#dc004e',
    logo_url: '',
    favicon_url: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/admin/webapp-config/public')
      setConfig(response.data)
      // Update document title
      if (response.data.page_title) {
        document.title = response.data.page_title
      }
      // Update favicon if provided
      if (response.data.favicon_url) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
        link.type = 'image/x-icon'
        link.rel = 'shortcut icon'
        link.href = response.data.favicon_url
        document.getElementsByTagName('head')[0].appendChild(link)
      }
    } catch (err) {
      console.error('Failed to load webapp config:', err)
    } finally {
      setLoading(false)
    }
  }

  return { config, loading }
}

