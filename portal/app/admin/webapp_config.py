"""Web application configuration endpoints."""
from flask import request, jsonify, current_app
from . import admin_bp
from ..db import db
from ..models import WebAppConfig
from ..utils.rbac import require_admin


@admin_bp.route('/webapp-config', methods=['GET'])
@require_admin
def get_webapp_config():
    """Get current webapp configuration."""
    config = WebAppConfig.query.filter_by(id=1).first()
    
    if not config:
        # Return defaults
        return jsonify({
            'app_title': 'HLSPG Portal',
            'page_title': 'Home Lab Single Pane of Glass',
            'domain': '',
            'primary_color': '#1976d2',
            'secondary_color': '#dc004e',
            'logo_url': '',
            'favicon_url': '',
            'footer_text': '',
            'login_title': '',
            'login_subtitle': '',
            'login_description': '',
            'cors_enabled': False,
            'proxy_host_validation_enabled': False,
        }), 200
    
    return jsonify({
        'app_title': config.app_title or 'HLSPG Portal',
        'page_title': config.page_title or 'Home Lab Single Pane of Glass',
        'domain': config.domain or '',
        'primary_color': config.primary_color or '#1976d2',
        'secondary_color': config.secondary_color or '#dc004e',
        'logo_url': config.logo_url or '',
        'favicon_url': config.favicon_url or '',
        'footer_text': config.footer_text or '',
        'login_title': config.login_title or '',
        'login_subtitle': config.login_subtitle or '',
        'login_description': config.login_description or '',
        'cors_enabled': config.cors_enabled if config.cors_enabled is not None else False,
        'proxy_host_validation_enabled': config.proxy_host_validation_enabled if config.proxy_host_validation_enabled is not None else False,
    }), 200


@admin_bp.route('/webapp-config', methods=['PUT'])
@require_admin
def update_webapp_config():
    """Update webapp configuration."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Get or create config record
    config = WebAppConfig.query.filter_by(id=1).first()
    if not config:
        config = WebAppConfig(id=1)
        db.session.add(config)
    
    # Update fields
    if 'app_title' in data:
        config.app_title = data['app_title'] or 'HLSPG Portal'
    if 'page_title' in data:
        config.page_title = data['page_title'] or 'Home Lab Single Pane of Glass'
    if 'domain' in data:
        config.domain = data['domain'] or None
    if 'primary_color' in data:
        config.primary_color = data['primary_color'] or '#1976d2'
    if 'secondary_color' in data:
        config.secondary_color = data['secondary_color'] or '#dc004e'
    if 'logo_url' in data:
        config.logo_url = data['logo_url'] or None
    if 'favicon_url' in data:
        config.favicon_url = data['favicon_url'] or None
    if 'footer_text' in data:
        config.footer_text = data['footer_text'] or None
    if 'login_title' in data:
        config.login_title = data['login_title'] or None
    if 'login_subtitle' in data:
        config.login_subtitle = data['login_subtitle'] or None
    if 'login_description' in data:
        config.login_description = data['login_description'] or None
    if 'cors_enabled' in data:
        config.cors_enabled = bool(data['cors_enabled'])
    if 'proxy_host_validation_enabled' in data:
        config.proxy_host_validation_enabled = bool(data['proxy_host_validation_enabled'])
    
    db.session.commit()
    
    # CORS setting changes take effect immediately (no restart needed)
    if 'cors_enabled' in data:
        current_app.logger.info(
            f'CORS setting changed to {config.cors_enabled}. Changes take effect immediately.'
        )
    
    return jsonify({
        'ok': True,
        'message': 'Webapp configuration updated successfully'
    }), 200


@admin_bp.route('/webapp-config/public', methods=['GET'])
def get_public_webapp_config():
    """Get public webapp configuration (for frontend) - no auth required."""
    try:
        config = WebAppConfig.query.filter_by(id=1).first()
        
        if not config:
            # Return defaults
            return jsonify({
                'app_title': 'HLSPG Portal',
                'page_title': 'Home Lab Single Pane of Glass',
                'primary_color': '#1976d2',
                'secondary_color': '#dc004e',
                'logo_url': '',
                'favicon_url': '',
                'login_title': '',
                'login_subtitle': '',
                'login_description': '',
            }), 200
        
        return jsonify({
            'app_title': config.app_title or 'HLSPG Portal',
            'page_title': config.page_title or 'Home Lab Single Pane of Glass',
            'primary_color': config.primary_color or '#1976d2',
            'secondary_color': config.secondary_color or '#dc004e',
            'logo_url': config.logo_url or '',
            'favicon_url': config.favicon_url or '',
            'login_title': config.login_title or '',
            'login_subtitle': config.login_subtitle or '',
            'login_description': config.login_description or '',
        }), 200
    except Exception as e:
        # If DB not ready, return defaults
        current_app.logger.warning(f'Failed to load webapp config: {e}')
        return jsonify({
            'app_title': 'HLSPG Portal',
            'page_title': 'Home Lab Single Pane of Glass',
            'primary_color': '#1976d2',
            'secondary_color': '#dc004e',
            'logo_url': '',
            'favicon_url': '',
            'login_title': '',
            'login_subtitle': '',
            'login_description': '',
        }), 200

