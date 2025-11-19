#!/bin/bash
set -e

# Wait for PostgreSQL
until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-portal}"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Run migrations (always run on startup to ensure DB is up to date)
echo "Running database migrations..."
set +e  # Temporarily disable exit on error
flask db upgrade
MIGRATION_STATUS=$?
set -e  # Re-enable exit on error

if [ $MIGRATION_STATUS -ne 0 ]; then
  echo "Warning: Migration failed (exit code: $MIGRATION_STATUS), but continuing..."
  echo "Bootstrap will handle missing tables gracefully on first run"
fi

# Copy nginx config if it exists
if [ -f /app/nginx.conf ]; then
    echo "Setting up nginx..."
    # Ensure nginx html directory exists
    mkdir -p /usr/share/nginx/html
    
    # Check if React app is built (index.html exists)
    if [ ! -f /usr/share/nginx/html/index.html ]; then
        echo "Warning: React app not found at /usr/share/nginx/html/index.html"
        echo "Nginx will proxy all requests to Flask backend"
        echo "To fix: Build the React app with 'cd admin-ui && npm run build'"
    else
        echo "React app found, nginx will serve static files"
    fi
    
    cp /app/nginx.conf /etc/nginx/conf.d/default.conf
    # Start nginx in background
    nginx
    # Change gunicorn to listen on port 3001 (nginx will proxy from 3000)
    exec gunicorn --bind 0.0.0.0:3001 --workers 4 --timeout 120 wsgi:app
else
    # No nginx config, run gunicorn directly on port 3000
    echo "Running gunicorn directly on port 3000 (no nginx config)"
    exec "$@"
fi

