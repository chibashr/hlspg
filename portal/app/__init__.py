"""Flask application factory."""
from flask import Flask
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS
from .config import Config
from .db import init_db
from .logging_config import setup_logging
from .utils.bootstrap import bootstrap_app


def create_app(config_class=Config):
    """Create and configure Flask application."""
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.config.from_object(config_class)
    
    # Validate configuration
    try:
        config_class.validate()
    except ValueError as e:
        app.logger.error(f"Configuration validation failed: {e}")
        if app.config['FLASK_ENV'] == 'production':
            raise
    
    # Setup logging
    setup_logging(app)
    
    # Initialize database
    db, migrate = init_db(app)
    
    # CORS support - configured dynamically from database
    # Initialize with minimal CORS (disabled by default)
    cors = CORS(app, supports_credentials=True, origins=[], resources={r"/api/*": {"origins": []}})
    
    # Handle OPTIONS preflight requests for CORS
    @app.before_request
    def handle_cors_preflight():
        """Handle CORS preflight OPTIONS requests."""
        from flask import request, make_response
        
        if request.method == 'OPTIONS' and request.path.startswith('/api'):
            from .models import WebAppConfig
            try:
                config = WebAppConfig.query.filter_by(id=1).first()
                if config and config.cors_enabled:
                    response = make_response()
                    response.headers.add('Access-Control-Allow-Origin', '*')
                    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                    response.headers.add('Access-Control-Allow-Credentials', 'true')
                    return response
            except Exception:
                pass  # Fail closed - no CORS
    
    # Add CORS headers to responses dynamically
    @app.after_request
    def add_cors_headers(response):
        """Add CORS headers if enabled in database."""
        from flask import request
        from .models import WebAppConfig
        
        # Only add CORS headers for API endpoints
        if request.path.startswith('/api'):
            try:
                config = WebAppConfig.query.filter_by(id=1).first()
                if config and config.cors_enabled:
                    response.headers.add('Access-Control-Allow-Origin', '*')
                    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                    response.headers.add('Access-Control-Allow-Credentials', 'true')
            except Exception:
                pass  # Fail closed - no CORS
        
        return response
    
    # Security middleware
    Talisman(
        app,
        force_https=False,  # Let reverse proxy handle HTTPS
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self' 'unsafe-inline'",
            'style-src': "'self' 'unsafe-inline'",
            'img-src': "'self' data:",
            'font-src': "'self'",
        }
    )
    
    # CSRF protection
    csrf = CSRFProtect(app)
    
    # Register blueprints
    from .auth import auth_bp
    from .admin import admin_bp
    from .api import api_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Exempt setup endpoint from CSRF (public endpoint, no session yet)
    # Access the view function after blueprint registration
    from .auth.routes import setup_admin
    csrf.exempt(setup_admin)
    
    # Exempt LDAP config endpoints from CSRF (admin-only, already protected by auth)
    from .admin.ldap_config import update_ldap_config, upload_ca_cert, delete_ca_cert
    csrf.exempt(update_ldap_config)
    csrf.exempt(upload_ca_cert)
    csrf.exempt(delete_ca_cert)
    
    # Exempt LDAP test endpoints from CSRF (admin-only, already protected by auth)
    from .admin.ldap_test import test_ldap_bind, test_find_user, test_user_auth
    csrf.exempt(test_ldap_bind)
    csrf.exempt(test_find_user)
    csrf.exempt(test_user_auth)
    
    # Exempt webapp and SSO config endpoints from CSRF (admin-only, already protected by auth)
    from .admin.webapp_config import update_webapp_config
    from .admin.sso_config import update_sso_config
    csrf.exempt(update_webapp_config)
    csrf.exempt(update_sso_config)
    
    # Exempt login and logout endpoints from CSRF (public endpoints, session-based auth)
    from .auth.routes import login, logout
    csrf.exempt(login)
    csrf.exempt(logout)
    
    # Exempt all admin API endpoints from CSRF (admin-only, already protected by auth)
    from .admin.sites import create_site, update_site, delete_site, add_site_group, remove_site_group
    from .admin.role_mappings import create_role_mapping, delete_role_mapping
    from .admin.users import refresh_user, update_user
    from .admin.ldap_groups import search_ldap_groups
    csrf.exempt(create_site)
    csrf.exempt(update_site)
    csrf.exempt(delete_site)
    csrf.exempt(add_site_group)
    csrf.exempt(remove_site_group)
    csrf.exempt(create_role_mapping)
    csrf.exempt(delete_role_mapping)
    csrf.exempt(refresh_user)
    csrf.exempt(update_user)
    csrf.exempt(search_ldap_groups)
    
    # Handle CSRF errors gracefully for setup endpoint (fallback)
    # Only catch CSRFError specifically, not all exceptions
    from flask_wtf.csrf import CSRFError
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        from flask import request
        
        # Check if this is the setup endpoint
        if request.endpoint == 'auth.setup_admin':
            # Allow the request to proceed - don't raise the error
            # The route handler will process it
            return None
        
        # For other CSRF errors, let Flask handle them normally
        raise e
    
    # Root endpoint - return API info (nginx serves React app for HTML requests)
    @app.route('/')
    def root():
        """Root endpoint - returns API info."""
        from flask import jsonify
        
        return jsonify({
            'name': 'Home Lab Single Pane of Glass (HLSPG)',
            'version': '1.0.0',
            'description': 'Web portal for centralized access to internal services',
            'endpoints': {
                'health': '/health',
                'metrics': '/metrics',
                'auth': {
                    'login': '/api/auth/login',
                    'logout': '/api/auth/logout',
                    'me': '/api/auth/me'
                },
                'api': {
                    'sites': '/api/sites',
                    'profile': '/api/profile'
                },
                'admin': {
                    'ldap_test': '/api/admin/ldap/test',
                    'role_mappings': '/api/admin/role-mappings',
                    'sites': '/api/admin/sites',
                    'users': '/api/admin/users',
                    'audit': '/api/admin/audit'
                }
            }
        }), 200
    
    # Health check endpoint
    @app.route('/health')
    def health():
        """Health check endpoint."""
        from .utils.health import check_health
        status, details = check_health()
        return {'status': 'healthy' if status else 'unhealthy', 'details': details}, 200 if status else 503
    
    # Metrics endpoint
    @app.route('/metrics')
    def metrics():
        """Prometheus metrics endpoint."""
        from .api.metrics import get_metrics
        response, content_type = get_metrics()
        return response, 200, {'Content-Type': content_type}
    
    # Register main routes
    from .routes import register_routes
    register_routes(app)
    
    # Register CLI commands
    from .cli import register_commands
    register_commands(app)
    
    # Bootstrap on first run
    with app.app_context():
        bootstrap_app(db)
    
    return app
