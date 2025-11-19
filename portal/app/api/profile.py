"""User profile endpoint."""
from flask import jsonify, session, request
from . import api_bp
from ..db import db
from ..models import User, AuditLog
from ..utils.rbac import get_user_roles
from ..utils.security import hash_password, verify_password


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


@api_bp.route('/profile/change-password', methods=['POST'])
def change_password():
    """Change current user's password (local accounts only)."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return jsonify({'error': 'User not found or disabled'}), 401
    
    # Only allow password changes for local accounts
    if user.dn:
        return jsonify({'error': 'Password changes are only allowed for local accounts. LDAP users must change their password through LDAP.'}), 400
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    # Validate new password
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters long'}), 400
    
    # Verify current password
    if user.password_hash:
        if not verify_password(current_password, user.password_hash):
            return jsonify({'error': 'Current password is incorrect'}), 400
    else:
        # Legacy: if no password hash exists, require current password to be provided
        # This handles the case where password was never set
        if not current_password:
            return jsonify({'error': 'Current password is required'}), 400
    
    # Hash and save new password
    user.password_hash = hash_password(new_password)
    db.session.commit()
    
    # Log password change
    try:
        audit_log = AuditLog(
            user_id=user.id,
            ip=request.remote_addr,
            action='password_changed',
            details={'user_id': user.id, 'uid': user.uid}
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception:
        pass  # Don't fail if audit logging fails
    
    return jsonify({'ok': True, 'message': 'Password changed successfully'}), 200

