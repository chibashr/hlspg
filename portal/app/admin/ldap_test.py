"""LDAP testing endpoints."""
from flask import request, jsonify, current_app
from . import admin_bp
from ..utils.rbac import require_admin
from ..ldap.connector import get_ldap_connection, LDAPConnectionError
from ..ldap.user_lookup import search_user, authenticate_user


@admin_bp.route('/ldap/test', methods=['GET'])
@require_admin
def test_ldap_connection():
    """Test LDAP connection."""
    try:
        conn = get_ldap_connection(bind_dn=None, bind_pw=None)
        conn.unbind()
        return jsonify({
            'success': True,
            'message': 'LDAP connection successful'
        }), 200
    except LDAPConnectionError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }), 500


@admin_bp.route('/ldap/test-bind', methods=['POST'])
@require_admin
def test_ldap_bind():
    """Test LDAP service account bind."""
    from ..models import LDAPConfig
    
    data = request.get_json() or {}
    
    # Check database config first
    db_config = LDAPConfig.query.filter_by(id=1, enabled=True).first()
    
    if db_config and db_config.ldap_url:
        # Use database config
        bind_dn = data.get('bind_dn') or db_config.ldap_bind_dn
        bind_password = data.get('bind_password') or db_config.ldap_bind_password
    else:
        # Fall back to environment variables
        bind_dn = data.get('bind_dn') or current_app.config.get('LDAP_BIND_DN')
        bind_password = data.get('bind_password') or current_app.config.get('LDAP_BIND_PASSWORD')
    
    if not bind_dn:
        return jsonify({
            'success': False,
            'error': 'bind_dn is required (not set in config or request)'
        }), 400
    
    if not bind_password:
        return jsonify({
            'success': False,
            'error': 'bind_password is required (not set in config or request)'
        }), 400
    
    # Log what we're trying (without password)
    current_app.logger.info(f"Testing LDAP bind with DN: {bind_dn}")
    
    try:
        conn = get_ldap_connection(bind_dn=bind_dn, bind_pw=bind_password)
        conn.unbind()
        return jsonify({
            'success': True,
            'message': 'LDAP bind successful'
        }), 200
    except LDAPConnectionError as e:
        error_msg = str(e)
        current_app.logger.error(f"LDAP bind failed: {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg,
            'details': {
                'bind_dn': bind_dn,
                'has_password': bool(bind_password),
                'password_length': len(bind_password) if bind_password else 0
            }
        }), 400
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        current_app.logger.error(error_msg, exc_info=True)
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


@admin_bp.route('/ldap/find-user', methods=['POST'])
@require_admin
def test_find_user():
    """Test user lookup."""
    data = request.get_json()
    if not data or 'username' not in data:
        return jsonify({
            'success': False,
            'error': 'username required'
        }), 400
    
    username = data['username']
    
    try:
        user_data = search_user(username)
        return jsonify({
            'success': True,
            'user': {
                'dn': user_data.get('dn'),
                'cn': user_data.get('cn'),
                'mail': user_data.get('mail'),
                'displayName': user_data.get('displayName'),
                'memberOf': user_data.get('memberOf', [])
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
    except LDAPConnectionError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@admin_bp.route('/ldap/test-auth', methods=['POST'])
@require_admin
def test_user_auth():
    """Test user authentication."""
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({
            'success': False,
            'error': 'username and password required'
        }), 400
    
    username = data['username']
    password = data['password']
    
    try:
        user_data = authenticate_user(username, password)
        return jsonify({
            'success': True,
            'message': 'Authentication successful',
            'user': {
                'dn': user_data.get('dn'),
                'cn': user_data.get('cn'),
                'mail': user_data.get('mail'),
                'memberOf': user_data.get('memberOf', [])
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 401
    except LDAPConnectionError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

