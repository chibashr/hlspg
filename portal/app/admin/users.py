"""User management endpoints."""
from flask import request, jsonify, session
from datetime import datetime
from . import admin_bp
from ..db import db
from ..models import User, AuditLog
from ..utils.rbac import require_admin, get_user_roles
from ..utils.security import hash_password
from ..ldap import get_user_groups, sync_group_to_db
from ..ldap.connector import LDAPConnectionError


@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    """List all users."""
    users = User.query.all()
    return jsonify({
        'users': [{
            'id': u.id,
            'uid': u.uid,
            'display_name': u.display_name,
            'email': u.email,
            'is_local_admin': u.is_local_admin,
            'disabled': u.disabled,
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'cached_groups': u.cached_groups or [],
            'roles': get_user_roles(u.id),
            'dn': u.dn,
            'auth_type': 'LDAP' if u.dn else 'Local'  # Authentication type
        } for u in users]
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@require_admin
def get_user(user_id):
    """Get a user."""
    user = User.query.get_or_404(user_id)
    return jsonify({
        'id': user.id,
        'uid': user.uid,
        'display_name': user.display_name,
        'email': user.email,
        'is_local_admin': user.is_local_admin,
        'disabled': user.disabled,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'cached_groups': user.cached_groups or [],
        'roles': get_user_roles(user.id),
        'dn': user.dn,
        'auth_type': 'LDAP' if user.dn else 'Local'  # Authentication type
    }), 200


@admin_bp.route('/users/<string:uid>/refresh', methods=['POST'])
@require_admin
def refresh_user(uid):
    """Force refresh user groups from LDAP."""
    user = User.query.filter_by(uid=uid).first_or_404()
    
    if not user.dn:
        return jsonify({'error': 'User has no DN (local admin?)'}), 400
    
    try:
        # Get fresh groups from LDAP using enhanced lookup
        group_dns = get_user_groups(user.uid)
        
        # Normalize and sync groups to database
        normalized_group_dns = []
        for group_dn in group_dns:
            normalized_dn = str(group_dn).strip()
            if normalized_dn:
                normalized_group_dns.append(normalized_dn)
                try:
                    sync_group_to_db(normalized_dn)
                except Exception as e:
                    from flask import current_app
                    current_app.logger.error(f"Failed to sync group {normalized_dn}: {str(e)}")
        
        # Update user with normalized groups
        user.cached_groups = normalized_group_dns
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'groups': normalized_group_dns,
            'roles': get_user_roles(user.id)
        }), 200
        
    except LDAPConnectionError as e:
        return jsonify({
            'error': f'LDAP connection failed: {str(e)}'
        }), 503
    except Exception as e:
        return jsonify({
            'error': f'Refresh failed: {str(e)}'
        }), 500


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    """Update a user."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    if 'disabled' in data:
        user.disabled = data['disabled']
    
    if 'display_name' in data:
        user.display_name = data['display_name']
    
    if 'email' in data:
        user.email = data['email']
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'uid': user.uid,
        'display_name': user.display_name,
        'email': user.email,
        'disabled': user.disabled
    }), 200


@admin_bp.route('/users/<int:user_id>/change-password', methods=['POST'])
@require_admin
def change_user_password(user_id):
    """Admin endpoint to change a user's password (local accounts only)."""
    user = User.query.get_or_404(user_id)
    
    # Only allow password changes for local accounts
    if user.dn:
        return jsonify({'error': 'Password changes are only allowed for local accounts. LDAP users must change their password through LDAP.'}), 400
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400
    
    # Validate new password
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters long'}), 400
    
    # Hash and save new password
    user.password_hash = hash_password(new_password)
    db.session.commit()
    
    # Log password change by admin
    try:
        admin_user_id = session.get('user_id')
        audit_log = AuditLog(
            user_id=admin_user_id,
            ip=request.remote_addr,
            action='admin_password_changed',
            details={
                'target_user_id': user.id,
                'target_uid': user.uid,
                'changed_by_user_id': admin_user_id
            }
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception:
        pass  # Don't fail if audit logging fails
    
    return jsonify({'ok': True, 'message': f'Password changed successfully for user {user.uid}'}), 200

