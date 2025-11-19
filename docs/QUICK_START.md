# Quick Start - Login & Authentication

## Initial Setup

1. **Set your admin password** in `.env`:
   ```bash
   INITIAL_LOCAL_ADMIN_USERNAME=portal-admin
   INITIAL_LOCAL_ADMIN_PASSWORD=your-secure-password
   ```

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

3. **Wait for migrations** to complete (check logs):
   ```bash
   docker-compose logs -f portal
   ```

## Login Methods

### Method 1: Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "portal-admin", "password": "your-secure-password"}' \
  -c cookies.txt

# Check your session
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Method 2: Using the Web Interface

1. Navigate to http://localhost:3000
2. Enter credentials:
   - Username: `portal-admin` (or your `INITIAL_LOCAL_ADMIN_USERNAME`)
   - Password: Your `INITIAL_LOCAL_ADMIN_PASSWORD`
3. After login, you'll be redirected to the dashboard (admin) or portal (regular user) based on your permissions

### Method 3: Using Python requests

```python
import requests

# Login
response = requests.post(
    'http://localhost:3000/api/auth/login',
    json={
        'username': 'portal-admin',
        'password': 'your-secure-password'
    }
)

print(response.json())
# Save session cookie for subsequent requests
session = requests.Session()
session.cookies = response.cookies

# Check current user
me = session.get('http://localhost:3000/api/auth/me')
print(me.json())
```

## Default Credentials

- **Username**: `portal-admin` (configurable via `INITIAL_LOCAL_ADMIN_USERNAME`)
- **Password**: Set via `INITIAL_LOCAL_ADMIN_PASSWORD` environment variable

**Important**: You MUST set `INITIAL_LOCAL_ADMIN_PASSWORD` in your `.env` file before starting the container!

## After Login

Once logged in, you can:

1. **Configure LDAP**:
   - POST `/api/admin/ldap/test` - Test LDAP connection
   - Configure LDAP settings via environment variables

2. **Manage Roles**:
   - GET `/api/admin/roles` - List roles
   - POST `/api/admin/role-mappings` - Map LDAP groups to roles

3. **Manage Sites**:
   - GET `/api/admin/sites` - List sites
   - POST `/api/admin/sites` - Create site

4. **View Audit Logs**:
   - GET `/api/admin/audit` - Query audit logs

## Troubleshooting

**"Invalid username or password"**:
- Check that `INITIAL_LOCAL_ADMIN_PASSWORD` is set in `.env`
- Restart the portal container after setting the password
- Check logs: `docker-compose logs portal`

**"Not authenticated"**:
- Your session may have expired (default: 120 minutes)
- Login again to get a new session

**Can't login**:
- Verify the user was created: Check bootstrap logs
- Check that `ALLOW_LOCAL_FALLBACK=true` in your environment
