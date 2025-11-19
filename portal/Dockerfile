# Stage 1: Build React app
FROM node:18-alpine AS react-builder

WORKDIR /app

# Copy admin-ui package files
COPY admin-ui/package.json admin-ui/package-lock.json* ./

# Install dependencies
RUN npm ci --only=production=false

# Copy admin-ui source files
COPY admin-ui/ .

# Build the React app
RUN npm run build

# Stage 2: Python portal with built React app
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY portal/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY portal/ .

# Copy built React app from builder stage
COPY --from=react-builder /app/dist /usr/share/nginx/html

# Create directories for logs and migrations
RUN mkdir -p /var/log/portal /app/migrations

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=wsgi.py

# Expose port
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "4", "--timeout", "120", "wsgi:app"]

