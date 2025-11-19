"""LDAP configuration endpoints."""
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from pathlib import Path
from . import admin_bp
from ..db import db
from ..models import LDAPConfig
from ..utils.rbac import require_admin


def get_ldap_config_from_db():
    """Get LDAP config from database, or None if not set."""
    config = LDAPConfig.query.filter_by(id=1).first()
    if config and config.enabled:
        return config
    return None


@admin_bp.route('/ldap/config', methods=['GET'])
@require_admin
def get_ldap_config():
    """Get current LDAP configuration (password masked)."""
    config = current_app.config
    
    # Check database config first
    db_config = get_ldap_config_from_db()
    
    if db_config:
        # Use database config
        return jsonify({
            'ldap_url': db_config.ldap_url or '',
            'ldap_use_tls': db_config.ldap_use_tls,
            'ldap_bind_dn': db_config.ldap_bind_dn or '',
            'ldap_bind_password': '***' if db_config.ldap_bind_password else '',
            'ldap_base_dn': db_config.ldap_base_dn or '',
            'ldap_user_dn': db_config.ldap_user_dn or '',
            'ldap_group_dn': db_config.ldap_group_dn or '',
            'ldap_user_filter': db_config.ldap_user_filter or '',
            'ldap_group_filter': db_config.ldap_group_filter or '',
            'ldap_group_attribute': db_config.ldap_group_attribute or 'memberOf',
            'ldap_ca_cert': db_config.ldap_ca_cert_path or '',
            'ldap_search_timeout': db_config.ldap_search_timeout or 5,
            'enabled': db_config.enabled,
            'source': 'database',
            'configured': bool(db_config.ldap_url),
        }), 200
    else:
        # Use environment variables
        return jsonify({
            'ldap_url': config.get('LDAP_URL', ''),
            'ldap_use_tls': config.get('LDAP_USE_TLS', True),
            'ldap_bind_dn': config.get('LDAP_BIND_DN', ''),
            'ldap_bind_password': '***' if config.get('LDAP_BIND_PASSWORD') else '',
            'ldap_base_dn': config.get('LDAP_BASE_DN', ''),
            'ldap_user_dn': config.get('LDAP_USER_DN', ''),
            'ldap_group_dn': config.get('LDAP_GROUP_DN', ''),
            'ldap_user_filter': config.get('LDAP_USER_FILTER', '(|(uid={username})(sAMAccountName={username})(mail={username}))'),
            'ldap_group_filter': config.get('LDAP_GROUP_FILTER', '(objectClass=group)'),
            'ldap_group_attribute': config.get('LDAP_GROUP_ATTRIBUTE', 'memberOf'),
            'ldap_ca_cert': config.get('LDAP_CA_CERT', ''),
            'ldap_search_timeout': config.get('LDAP_SEARCH_TIMEOUT', 5),
            'enabled': False,
            'source': 'environment',
            'configured': bool(config.get('LDAP_URL')),
        }), 200


@admin_bp.route('/ldap/config', methods=['PUT'])
@require_admin
def update_ldap_config():
    """Update LDAP configuration in database."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Get or create config record
    config = LDAPConfig.query.filter_by(id=1).first()
    if not config:
        config = LDAPConfig(id=1)
        db.session.add(config)
    
    # Update fields (only if provided)
    if 'ldap_url' in data:
        config.ldap_url = data['ldap_url'] or None
    if 'ldap_use_tls' in data:
        config.ldap_use_tls = data['ldap_use_tls']
    if 'ldap_bind_dn' in data:
        config.ldap_bind_dn = data['ldap_bind_dn'] or None
    if 'ldap_bind_password' in data:
        # Only update if not empty (empty string means don't change)
        if data['ldap_bind_password'] and data['ldap_bind_password'] != '***':
            config.ldap_bind_password = data['ldap_bind_password']
    if 'ldap_base_dn' in data:
        config.ldap_base_dn = data['ldap_base_dn'] or None
    if 'ldap_user_dn' in data:
        config.ldap_user_dn = data['ldap_user_dn'] or None
    if 'ldap_group_dn' in data:
        config.ldap_group_dn = data['ldap_group_dn'] or None
    if 'ldap_user_filter' in data:
        config.ldap_user_filter = data['ldap_user_filter'] or None
    if 'ldap_group_filter' in data:
        config.ldap_group_filter = data['ldap_group_filter'] or None
    if 'ldap_group_attribute' in data:
        config.ldap_group_attribute = data['ldap_group_attribute'] or 'memberOf'
    if 'ldap_search_timeout' in data:
        config.ldap_search_timeout = int(data['ldap_search_timeout']) if data['ldap_search_timeout'] else 5
    if 'enabled' in data:
        config.enabled = data['enabled']
    
    # Validate required fields if enabled
    if config.enabled:
        errors = []
        if not config.ldap_url:
            errors.append('LDAP URL is required')
        if not config.ldap_base_dn:
            errors.append('Base DN is required')
        if config.ldap_use_tls and not config.ldap_ca_cert_path:
            errors.append('CA Certificate is required when TLS is enabled')
        # Note: bind_dn and bind_password are required for service account operations
        # but we allow saving without them (user might configure later)
        
        if errors:
            return jsonify({
                'error': 'Validation failed',
                'details': errors
            }), 400
    
    db.session.commit()
    
    return jsonify({
        'ok': True,
        'message': 'LDAP configuration updated successfully'
    }), 200


@admin_bp.route('/ldap/config/ca-cert', methods=['POST'])
@require_admin
def upload_ca_cert():
    """Upload CA certificate file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file extension
    if not file.filename.endswith(('.pem', '.crt', '.cer', '.cert')):
        return jsonify({'error': 'Invalid file type. Only .pem, .crt, .cer, .cert files are allowed'}), 400
    
    # Create secrets directory if it doesn't exist
    secrets_dir = Path('/run/secrets')
    secrets_dir.mkdir(parents=True, exist_ok=True)
    
    # Also create a local directory for uploaded certs
    certs_dir = Path('/app/certs')
    certs_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filename = secure_filename(f'ldap_ca_{file.filename}')
    cert_path = certs_dir / filename
    
    try:
        file.save(str(cert_path))
        
        # Update config with cert path
        config = LDAPConfig.query.filter_by(id=1).first()
        if not config:
            config = LDAPConfig(id=1)
            db.session.add(config)
        
        config.ldap_ca_cert_path = str(cert_path)
        config.enabled = True  # Enable DB config when cert is uploaded
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': 'CA certificate uploaded successfully',
            'path': str(cert_path)
        }), 200
    except Exception as e:
        return jsonify({
            'error': f'Failed to save certificate: {str(e)}'
        }), 500


@admin_bp.route('/ldap/config/ca-cert', methods=['DELETE'])
@require_admin
def delete_ca_cert():
    """Delete uploaded CA certificate."""
    config = LDAPConfig.query.filter_by(id=1).first()
    if not config or not config.ldap_ca_cert_path:
        return jsonify({'error': 'No certificate configured'}), 404
    
    cert_path = Path(config.ldap_ca_cert_path)
    if cert_path.exists():
        try:
            cert_path.unlink()
        except Exception as e:
            current_app.logger.warning(f'Failed to delete cert file: {e}')
    
    config.ldap_ca_cert_path = None
    db.session.commit()
    
    return jsonify({
        'ok': True,
        'message': 'CA certificate removed'
    }), 200
