"""SSO configuration endpoints."""
from flask import request, jsonify
from . import admin_bp
from ..db import db
from ..models import SSOConfig
from ..utils.rbac import require_admin


@admin_bp.route('/sso-config', methods=['GET'])
@require_admin
def get_sso_config():
    """Get current SSO configuration."""
    config = SSOConfig.query.filter_by(id=1).first()
    
    if not config:
        return jsonify({
            'account_settings_url': '',
        }), 200
    
    return jsonify({
        'account_settings_url': config.account_settings_url or '',
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
    
    # Update account_settings_url
    if 'account_settings_url' in data:
        config.account_settings_url = data['account_settings_url'].strip() if data['account_settings_url'] else None
    
    db.session.commit()
    
    return jsonify({
        'ok': True,
        'message': 'SSO configuration updated successfully'
    }), 200

