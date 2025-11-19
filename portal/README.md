# HLSPG Portal Backend

Flask-based backend for the Home Lab Single Pane of Glass portal.

## Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Local Development

1. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set environment variables (copy from `.env.example`)

4. Initialize database:
   ```bash
   flask db upgrade
   ```

5. Run development server:
   ```bash
   python wsgi.py
   ```

## Testing

Run tests:
```bash
pytest
```

With coverage:
```bash
pytest --cov=app --cov-report=html
```

## Database Migrations

Create migration:
```bash
flask db migrate -m "Description"
```

Apply migration:
```bash
flask db upgrade
```

## Project Structure

```
portal/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # Configuration
│   ├── db.py                # Database setup
│   ├── models.py            # SQLAlchemy models
│   ├── auth/                # Authentication routes
│   ├── admin/               # Admin API routes
│   ├── api/                 # User API routes
│   ├── ldap/                # LDAP integration
│   └── utils/               # Utilities
├── migrations/              # Alembic migrations
├── tests/                   # Test suite
└── wsgi.py                  # WSGI entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

### User API
- `GET /api/sites` - Accessible sites
- `GET /api/profile` - User profile

### Admin API
- `GET /api/admin/ldap/test` - Test LDAP connection
- `GET /api/admin/role-mappings` - List role mappings
- `POST /api/admin/role-mappings` - Create role mapping
- `GET /api/admin/sites` - List sites
- `POST /api/admin/sites` - Create site
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:uid/refresh` - Refresh user groups
- `GET /api/admin/audit` - Query audit logs

### System
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## License

Copyright (c) 2024 chibashr

