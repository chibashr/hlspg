# Authentication Guide

## Overview

HLSPG supports two authentication methods:
1. **LDAP/LDAPS** (primary) - Authenticates against your LDAP server
2. **Local Admin Fallback** (bootstrap) - For initial setup when LDAP is not configured

## Login Process

### API Endpoint

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "uid": "portal-admin",
    "display_name": "Initial Administrator",
    "email": "admin@example.com",
    "is_local_admin": true
  },
  "roles": ["admin"]
}
```

**Error Response (401):**
```json
{
  "error": "Invalid username or password"
}
```

### Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "portal-admin", "password": "your-password"}' \
  -c cookies.txt

# Check current user (uses session cookie)
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Using the React Admin UI

1. Navigate to the admin UI (if deployed separately)
2. Go to the login page
3. Enter your credentials
4. Session is maintained via secure cookies

## Initial Admin Setup

On first run, the system creates an initial admin user with:

- **Username**: Set via `INITIAL_LOCAL_ADMIN_USERNAME` environment variable (default: `portal-admin`)
- **Password**: Set via `INITIAL_LOCAL_ADMIN_PASSWORD` environment variable

**Important**: You must set `INITIAL_LOCAL_ADMIN_PASSWORD` in your `.env` file or environment variables.

### Setting Initial Admin Password

1. Edit your `.env` file:
   ```bash
   INITIAL_LOCAL_ADMIN_USERNAME=portal-admin
   INITIAL_LOCAL_ADMIN_PASSWORD=your-secure-password-here
   ```

2. Restart the portal container:
   ```bash
   docker-compose restart portal
   ```

3. Login with the credentials you set

## LDAP Authentication

Once LDAP is configured:

1. Set LDAP environment variables in `.env`:
   ```
   LDAP_URL=ldaps://ldap.example.com:636
   LDAP_BIND_DN=cn=portal-service,ou=services,dc=example,dc=com
   LDAP_BIND_PASSWORD=service-account-password
   LDAP_BASE_DN=dc=example,dc=com
   LDAP_CA_CERT=/run/secrets/ldap_ca.pem
   ```

2. Test LDAP connection via Admin UI:
   - Login as initial admin
   - Navigate to "LDAP Setup"
   - Test connection

3. Configure role mappings:
   - Map LDAP groups to application roles
   - Users in mapped groups will get those roles

4. Login with LDAP credentials:
   - Use your LDAP username and password
   - System will authenticate against LDAP
   - Your LDAP groups will be cached and mapped to roles

## Session Management

- Sessions are stored in Redis
- Default timeout: 120 minutes (configurable via `SESSION_TIMEOUT_MINUTES`)
- Secure cookies are used (set `SESSION_COOKIE_SECURE=true` in production)
- CSRF protection is enabled

## Logout

**POST** `/api/auth/logout`

Clears the session and logs the logout event in the audit log.

## Security Notes

- Rate limiting: 5 login attempts per 60 seconds per IP
- All authentication events are logged to the audit log
- Passwords are never stored in plain text
- LDAP passwords are verified via bind operation (never stored)
- Local admin passwords are hashed using bcrypt

