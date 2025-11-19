"""SSO configuration endpoints."""
from flask import request, jsonify, current_app
from . import admin_bp
from ..db import db
from ..models import SSOConfig
from ..utils.rbac import require_admin


@admin_bp.route('/sso-config', methods=['GET'])
@require_admin
def get_sso_config():
    """Get current SSO configuration (password masked)."""
    config = SSOConfig.query.filter_by(id=1).first()
    
    if not config:
        # Return defaults
        return jsonify({
            'provider': 'oidc',
            'enabled': False,
            'issuer_url': '',
            'authorization_endpoint': '',
            'token_endpoint': '',
            'userinfo_endpoint': '',
            'client_id': '',
            'client_secret': '',
            'redirect_uri': '',
            'scopes': 'openid profile email',
            # Legacy fields
            'sso_url': '',
            'realm': '',
        }), 200
    
    # Use issuer_url if set, otherwise fall back to sso_url for backward compatibility
    issuer_url = config.issuer_url or config.sso_url or ''
    
    return jsonify({
        'provider': config.provider or 'oidc',
        'enabled': config.enabled or False,
        'issuer_url': issuer_url,
        'authorization_endpoint': config.authorization_endpoint or '',
        'token_endpoint': config.token_endpoint or '',
        'userinfo_endpoint': config.userinfo_endpoint or '',
        'client_id': config.client_id or '',
        'client_secret': '***' if config.client_secret else '',
        'redirect_uri': config.redirect_uri or '',
        'scopes': config.scopes or 'openid profile email',
        # Legacy fields for backward compatibility
        'sso_url': config.sso_url or '',
        'realm': config.realm or '',
    }), 200


@admin_bp.route('/sso-config', methods=['PUT'])
@require_admin
def update_sso_config():
    """Update SSO configuration."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Get or create config record
    config = SSOConfig.query.filter_by(id=1).first()
    if not config:
        config = SSOConfig(id=1)
        db.session.add(config)
    
    # Update fields
    if 'provider' in data:
        config.provider = data['provider'] or 'oidc'
    if 'enabled' in data:
        config.enabled = data['enabled']
    if 'issuer_url' in data:
        config.issuer_url = data['issuer_url'] or None
    if 'authorization_endpoint' in data:
        config.authorization_endpoint = data['authorization_endpoint'] or None
    if 'token_endpoint' in data:
        config.token_endpoint = data['token_endpoint'] or None
    if 'userinfo_endpoint' in data:
        config.userinfo_endpoint = data['userinfo_endpoint'] or None
    if 'client_id' in data:
        config.client_id = data['client_id'] or None
    if 'client_secret' in data:
        # Only update if not empty and not the masked value
        if data['client_secret'] and data['client_secret'] != '***':
            config.client_secret = data['client_secret']
    if 'redirect_uri' in data:
        config.redirect_uri = data['redirect_uri'] or None
    if 'scopes' in data:
        config.scopes = data['scopes'] or 'openid profile email'
    # Legacy fields for backward compatibility
    if 'sso_url' in data:
        config.sso_url = data['sso_url'] or None
        # If issuer_url not set, use sso_url
        if not config.issuer_url:
            config.issuer_url = config.sso_url
    if 'realm' in data:
        config.realm = data['realm'] or None
    
    db.session.commit()
    
    return jsonify({
        'ok': True,
        'message': 'SSO configuration updated successfully'
    }), 200

