# HLSPG Architecture

## Overview

Home Lab Single Pane of Glass (HLSPG) is a web portal that provides centralized access to internal services with LDAP authentication and role-based access control.

## System Architecture

```
┌─────────┐
│  Users  │
└────┬────┘
     │
     ▼
┌─────────────────────┐
│ Nginx Proxy Manager │
└────┬────────────────┘
     │
     ▼
┌──────────────────────────┐
│  Portal (Flask + React)  │
│  - Nginx serves React UI │
│  - Flask API backend     │
└────┬─────────────────────┘
     │
     ├──────────┬──────────┬─────────────┐
     │          │          │             │
     ▼          ▼          ▼             ▼
┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│Postgres │ │Redis │ │  LDAPS   │ │  OIDC    │
│         │ │      │ │  Server  │ │  (opt)   │
└─────────┘ └──────┘ └──────────┘ └──────────┘
```

## Components

### Portal (Flask Backend)

- **Framework**: Flask 3.0
- **Database**: PostgreSQL 15 (via SQLAlchemy)
- **Session Store**: Redis
- **Authentication**: LDAPS with CA verification
- **API**: RESTful JSON API

### Admin UI (React Frontend)

- **Framework**: React 18 with Material-UI
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios

### Data Flow

1. User authenticates via LDAP
2. User's LDAP groups are cached in database
3. Groups are mapped to application roles
4. Roles determine access to sites
5. Sites are filtered based on user's group memberships

## Security

- LDAPS with mandatory CA certificate verification
- CSRF protection (Flask-WTF)
- Security headers (Flask-Talisman)
- Rate limiting (Redis-based)
- Secure session cookies
- Audit logging for all security events

## Database Schema

See `portal/app/models.py` for complete schema:

- `users` - Cached user records
- `ldap_groups` - Discovered LDAP groups
- `roles` - Application roles
- `role_mappings` - LDAP group → role mappings
- `sites` - Internal sites/machines
- `group_site_map` - Group → site access mappings
- `audit_log` - Security audit events

## Deployment

See `docker-compose.yml` for deployment configuration. The system consists of:

- Portal service (Flask + React UI built into container)
- PostgreSQL database
- Redis cache

The React admin UI is built as part of the portal container using a multi-stage Docker build, eliminating the need for a separate builder container.

## Configuration

All configuration is environment-driven. See `.env.example` for all available options.

