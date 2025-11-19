"""Health check utilities."""
from flask import current_app
from ..db import db


def check_health():
    """
    Check health of all dependencies.
    
    Returns:
        tuple: (is_healthy, details_dict)
    """
    details = {}
    all_healthy = True
    
    # Check database
    try:
        db.session.execute(db.text('SELECT 1'))
        details['database'] = 'healthy'
    except Exception as e:
        details['database'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check Redis
    try:
        from .security import get_redis_client
        redis_client = get_redis_client()
        redis_client.ping()
        details['redis'] = 'healthy'
    except Exception as e:
        details['redis'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check LDAP (optional - don't fail if not configured)
    ldap_url = current_app.config.get('LDAP_URL')
    if ldap_url:
        try:
            from ..ldap import get_ldap_connection
            # Just test connection, don't bind
            conn = get_ldap_connection(bind_dn=None, bind_pw=None)
            conn.unbind()
            details['ldap'] = 'healthy'
        except Exception as e:
            details['ldap'] = f'unhealthy: {str(e)}'
            # LDAP failure doesn't make app unhealthy if fallback is enabled
            if not current_app.config.get('ALLOW_LOCAL_FALLBACK'):
                all_healthy = False
    else:
        details['ldap'] = 'not configured'
    
    return all_healthy, details

