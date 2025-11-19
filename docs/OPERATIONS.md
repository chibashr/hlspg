# HLSPG Operations Runbook

## Initial Setup

### 1. Bootstrap

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate a strong `SECRET_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. Configure LDAP settings in `.env`:
   - `LDAP_URL`
   - `LDAP_BIND_DN`
   - `LDAP_BIND_PASSWORD`
   - `LDAP_BASE_DN`
   - `LDAP_CA_CERT` (path to CA certificate)

4. Set initial admin credentials:
   - `INITIAL_LOCAL_ADMIN_USERNAME`
   - `INITIAL_LOCAL_ADMIN_PASSWORD`

5. Start services:
   ```bash
   docker-compose up -d
   ```

6. Run database migrations:
   ```bash
   docker-compose exec portal flask db upgrade
   ```

### 2. First Login

1. Access portal at `https://chibashr.local` (or `http://localhost:3000`)
2. Login with initial admin credentials
3. Navigate to Admin > LDAP Setup
4. Test LDAP connection
5. Configure role mappings (LDAP groups → application roles)
6. Add sites and map groups to sites

### 3. Disable Local Fallback

Once LDAP is confirmed working:

1. Ensure at least one LDAP group is mapped to the `admin` role
2. Test login with an LDAP user in that group
3. Set `ALLOW_LOCAL_FALLBACK=false` in `.env`
4. Restart portal service

## LDAP Outage Recovery

If LDAP becomes unavailable:

1. Set `ALLOW_LOCAL_FALLBACK=true` in `.env`
2. Restart portal service
3. Login with local admin account
4. Investigate LDAP issue
5. Once resolved, disable local fallback again

## Rotating LDAP Credentials

1. Update credentials in `.env` or secrets manager
2. Test connection via Admin > LDAP Setup
3. Restart portal service
4. Verify login still works

## Rotating CA Certificate

1. Update `LDAP_CA_CERT` path or mount new certificate
2. Test connection via Admin > LDAP Setup
3. Restart portal service

## Database Backups

### Manual Backup

```bash
docker-compose exec postgres pg_dump -U portal portal > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U portal portal < backup_YYYYMMDD.sql
```

## Monitoring

### Health Checks

- Portal: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/metrics`

### Logs

```bash
# Portal logs
docker-compose logs -f portal

# All services
docker-compose logs -f
```

## Troubleshooting

### Portal won't start

1. Check logs: `docker-compose logs portal`
2. Verify database is accessible
3. Verify Redis is accessible
4. Check configuration validation errors

### LDAP connection fails

1. Verify `LDAP_URL` is correct
2. Check CA certificate is mounted and readable
3. Test connection via Admin UI
4. Check network connectivity to LDAP server
5. Verify service account credentials

### Users can't see sites

1. Verify user's LDAP groups are cached (check User Management)
2. Verify groups are mapped to roles (Role Management)
3. Verify sites have groups mapped (Site Management)
4. Force refresh user groups if needed

## Maintenance

### Update Application

1. Pull latest code
2. Rebuild images: `docker-compose build`
3. Run migrations: `docker-compose exec portal flask db upgrade`
4. Restart services: `docker-compose restart`

### Cleanup Old Audit Logs

```sql
DELETE FROM audit_log WHERE ts < NOW() - INTERVAL '90 days';
```

### Cleanup Stale Groups

```sql
DELETE FROM ldap_groups WHERE last_seen < NOW() - INTERVAL '180 days';
```

