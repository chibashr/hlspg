# Web Interface Setup

## Quick Start

1. **Set your admin password** in `.env`:
   ```bash
   INITIAL_LOCAL_ADMIN_USERNAME=portal-admin
   INITIAL_LOCAL_ADMIN_PASSWORD=your-secure-password
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the web interface**:
   - Open your browser to: **http://localhost:3000**
   - You'll see the login page

4. **Login**:
   - Username: `portal-admin` (or your `INITIAL_LOCAL_ADMIN_USERNAME`)
   - Password: Your `INITIAL_LOCAL_ADMIN_PASSWORD`

## What You'll See

After logging in, you'll have access to:

- **Dashboard** - Overview
- **LDAP Setup** - Configure and test LDAP connection
- **Role Management** - Map LDAP groups to application roles
- **Site Management** - Add and manage internal sites
- **User Management** - View users and refresh their groups
- **Audit Log** - View security audit events

## Architecture

- **Port 3000**: Unified portal serving both React UI and Flask API backend (http://localhost:3000)
  - Nginx serves the React application for all non-API routes
  - API requests (`/api/*`) are proxied to the Flask backend
  - The same interface provides both admin and user portals based on permissions

## Troubleshooting

**Can't access http://localhost:3000**:
- Check if portal container is running: `docker-compose ps`
- Check logs: `docker-compose logs portal`
- Rebuild the portal container: `docker-compose up -d --build portal`
- Verify nginx is serving the React app: Check portal logs for nginx errors

**Login fails**:
- Verify `INITIAL_LOCAL_ADMIN_PASSWORD` is set in `.env`
- Check portal logs: `docker-compose logs portal`
- Verify user was created during bootstrap

**API requests fail**:
- Check that portal service is running: `docker-compose ps`
- Verify nginx proxy config in portal container
- Check browser console for CORS or network errors
- Rebuild the portal container if React app changes: `docker-compose up -d --build portal`
