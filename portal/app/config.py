"""Configuration management from environment variables."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()


class Config:
    """Base configuration class."""
    
    # General
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    APP_HOST = os.getenv('APP_HOST', '0.0.0.0')
    APP_PORT = int(os.getenv('APP_PORT', 3000))
    SECRET_KEY = os.getenv('SECRET_KEY')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_TO_STDOUT = os.getenv('LOG_TO_STDOUT', 'true').lower() == 'true'
    MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'false').lower() == 'true'
    
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        POSTGRES_USER = os.getenv('POSTGRES_USER', 'portal')
        POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'portalpass')
        POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'postgres')
        POSTGRES_DB = os.getenv('POSTGRES_DB', 'portal')
        POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
        DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
    SESSION_TYPE = os.getenv('SESSION_TYPE', 'redis')
    SESSION_REDIS = os.getenv('SESSION_REDIS_URL', REDIS_URL)
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = 'hlspg:session:'
    
    # LDAP
    LDAP_URL = os.getenv('LDAP_URL', '')
    LDAP_USE_TLS = os.getenv('LDAP_USE_TLS', 'true').lower() == 'true'
    LDAP_BIND_DN = os.getenv('LDAP_BIND_DN', '')
    LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD', '')
    LDAP_BASE_DN = os.getenv('LDAP_BASE_DN', '')
    LDAP_USER_DN = os.getenv('LDAP_USER_DN', '')
    LDAP_GROUP_DN = os.getenv('LDAP_GROUP_DN', '')
    LDAP_USER_FILTER = os.getenv('LDAP_USER_FILTER', '(|(uid={username})(sAMAccountName={username})(mail={username}))')
    LDAP_GROUP_ATTRIBUTE = os.getenv('LDAP_GROUP_ATTRIBUTE', 'memberOf')
    LDAP_CA_CERT = os.getenv('LDAP_CA_CERT', '')
    LDAP_SEARCH_TIMEOUT = int(os.getenv('LDAP_SEARCH_TIMEOUT', '5'))
    
    # Session
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    SESSION_COOKIE_HTTPONLY = True
    # Don't set domain - allows cookies to work across ports on same host
    # Setting domain would restrict cookies to specific subdomain
    SESSION_COOKIE_DOMAIN = None
    # Set path to root so cookies work for all routes
    SESSION_COOKIE_PATH = '/'
    PERMANENT_SESSION_LIFETIME = int(os.getenv('SESSION_TIMEOUT_MINUTES', '120')) * 60
    
    # Admin
    INITIAL_LOCAL_ADMIN_USERNAME = os.getenv('INITIAL_LOCAL_ADMIN_USERNAME', 'portal-admin')
    INITIAL_LOCAL_ADMIN_PASSWORD = os.getenv('INITIAL_LOCAL_ADMIN_PASSWORD', '')
    ALLOW_LOCAL_FALLBACK = os.getenv('ALLOW_LOCAL_FALLBACK', 'true').lower() == 'true'
    
    # OIDC (optional - for SSO configuration)
    OIDC_ISSUER_URL = os.getenv('OIDC_ISSUER_URL', '')
    OIDC_CLIENT_ID = os.getenv('OIDC_CLIENT_ID', '')
    OIDC_CLIENT_SECRET = os.getenv('OIDC_CLIENT_SECRET', '')
    # Legacy Keycloak support (deprecated - use OIDC_* instead)
    KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', '')  # Deprecated
    KEYCLOAK_CLIENT_ID = os.getenv('KEYCLOAK_CLIENT_ID', '')  # Deprecated
    KEYCLOAK_CLIENT_SECRET = os.getenv('KEYCLOAK_CLIENT_SECRET', '')  # Deprecated
    KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM', '')  # Deprecated
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', '10'))
    RATE_LIMIT_PERIOD = int(os.getenv('RATE_LIMIT_PERIOD', '60'))
    
    # Security
    ALLOWED_PROXIED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_PROXIED_HOSTS', 'chibashr.local').split(',')]
    MAINTAINER_EMAIL = os.getenv('MAINTAINER_EMAIL', '')
    
    # Database Migration
    DB_AUTO_MIGRATE = os.getenv('DB_AUTO_MIGRATE', 'false').lower() == 'true'
    
    # WTF CSRF
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    
    @staticmethod
    def validate():
        """Validate required configuration."""
        errors = []
        
        if Config.FLASK_ENV == 'production':
            if not Config.SECRET_KEY or Config.SECRET_KEY == 'change-me-in-production-use-strong-random-key':
                errors.append("SECRET_KEY must be set to a strong random value in production")
        
        if not Config.SECRET_KEY:
            errors.append("SECRET_KEY is required")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))
        
        return True

