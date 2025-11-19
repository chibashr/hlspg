"""User profile endpoint."""
from flask import jsonify, session
from . import api_bp
from ..db import db
from ..models import User
from ..utils.rbac import get_user_roles


@api_bp.route('/profile', methods=['GET'])
def get_profile():
    """Get current user profile."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return jsonify({'error': 'User not found or disabled'}), 401
    
    roles = get_user_roles(user.id)
    if user.is_local_admin:
        roles.append('admin')
    
    return jsonify({
        'user': {
            'id': user.id,
            'uid': user.uid,
            'display_name': user.display_name,
            'email': user.email,
            'is_local_admin': user.is_local_admin,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'dn': user.dn,  # Distinguished Name for LDAP users
            'auth_type': 'LDAP' if user.dn else 'Local'  # Authentication type indicator
        },
        'roles': roles,
        'groups': user.cached_groups or []
    }), 200

