# Home Lab Single Pane of Glass (HLSPG)

A web portal providing centralized access to internal services with LDAP authentication, role-based access control, and site management.

## Architecture

```
Users -> Nginx Proxy Manager -> Portal (Flask) -> Postgres
                                         -> Redis (sessions, rate-limit)
                                         -> LDAPS server (TLS, CA verified)
                                         -> OIDC Provider (optional)
```

## Quick Start

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

2. Build and start services:
   ```bash
   docker-compose up --build -d
   ```
   
   This will automatically:
   - Build the React admin UI
   - Build the Flask portal backend
   - Start all services (postgres, redis, portal)
   
   The React app is built inside Docker, so no local Node.js installation is required.

3. Access the portal:
   - Portal: https://example.com (or http://localhost:3000)
   - Initial admin: Use `INITIAL_LOCAL_ADMIN_USERNAME` and `INITIAL_LOCAL_ADMIN_PASSWORD` from `.env`
   - Note: The unified portal serves both admin and user interfaces on port 3000

4. Configure LDAP:
   - Log in as initial admin
   - Navigate to Admin > LDAP Setup
   - Test LDAP connection and configure role mappings

## Features

- **LDAP Authentication**: Primary authentication via LDAPS with CA verification
- **Local Admin Fallback**: Bootstrap admin account for initial setup
- **Role-Based Access Control**: Map LDAP groups to application roles
- **Site Management**: Control access to internal sites based on LDAP groups
- **Admin UI**: React-based administration interface
- **Audit Logging**: Comprehensive audit trail of all security events
- **Security**: CSRF protection, rate limiting, secure cookies, security headers

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture details
- [Operations](docs/OPERATIONS.md) - Operational runbook
- [Backend](portal/README.md) - Backend-specific documentation

## Development

See `portal/README.md` and `admin-ui/README.md` for development setup instructions.

## License

Copyright (c) 2024 chibashr

