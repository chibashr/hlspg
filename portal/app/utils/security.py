"""Security utilities: rate limiting, password hashing, etc."""
import bcrypt
import redis
from functools import wraps
from flask import request, jsonify, current_app
from datetime import timedelta


def hash_password(password):
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, hashed):
    """Verify a password against a hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def get_redis_client():
    """Get Redis client from config."""
    redis_url = current_app.config.get('REDIS_URL', 'redis://redis:6379/0')
    return redis.from_url(redis_url, decode_responses=True)


def rate_limit(max_requests=None, period=None, key_func=None):
    """
    Rate limiting decorator using Redis.
    
    Args:
        max_requests: Maximum requests allowed
        period: Time period in seconds
        key_func: Function to generate rate limit key (default: IP address)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not max_requests:
                max_requests_val = current_app.config.get('RATE_LIMIT_REQUESTS', 10)
            else:
                max_requests_val = max_requests
            
            if not period:
                period_val = current_app.config.get('RATE_LIMIT_PERIOD', 60)
            else:
                period_val = period
            
            if not key_func:
                key = f"rate_limit:{request.remote_addr}"
            else:
                key = key_func()
            
            try:
                redis_client = get_redis_client()
                current = redis_client.get(key)
                
                if current and int(current) >= max_requests_val:
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'retry_after': period_val
                    }), 429
                
                pipe = redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, period_val)
                pipe.execute()
                
            except Exception as e:
                current_app.logger.warning(f"Rate limiting check failed: {str(e)}")
                # Continue on Redis failure (fail open)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_proxied_url(url):
    """
    Validate that a URL is in the allowed proxied hosts list.
    Checks database setting first - if proxy_host_validation_enabled is False, always returns True.
    
    Args:
        url: URL to validate
    
    Returns:
        bool: True if allowed, False otherwise
    """
    from urllib.parse import urlparse
    from ..models import WebAppConfig
    
    try:
        # Check if proxy host validation is enabled
        config = WebAppConfig.query.filter_by(id=1).first()
        if not config or not config.proxy_host_validation_enabled:
            # Validation disabled - allow all
            return True
        
        parsed = urlparse(url)
        host = parsed.netloc.split(':')[0]  # Remove port if present
        
        allowed_hosts = current_app.config.get('ALLOWED_PROXIED_HOSTS', [])
        
        for allowed in allowed_hosts:
            if allowed.startswith('*.'):
                # Wildcard subdomain match
                domain = allowed[2:]
                if host.endswith('.' + domain) or host == domain:
                    return True
            elif host == allowed:
                return True
        
        return False
    except Exception:
        # On error, fail closed if validation is enabled
        # But we can't check the config in exception handler, so return False
        return False

