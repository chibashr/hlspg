"""Role-based access control utilities."""
from functools import wraps
from flask import jsonify, session, current_app
from ..db import db
from ..models import User, Role, RoleMapping, LDAPGroup


def get_user_roles(user_id):
    """
    Get roles for a user based on their cached groups.
    
    Args:
        user_id: User ID
    
    Returns:
        list: List of role names
    """
    from flask import current_app
    from sqlalchemy import func
    
    user = User.query.get(user_id)
    if not user:
        current_app.logger.debug(f"User {user_id} not found for role lookup")
        return []
    
    if not user.cached_groups:
        current_app.logger.debug(f"User {user.uid} has no cached groups")
        return []
    
    # Get all role mappings for user's groups
    # Normalize group DNs (strip whitespace and handle various formats)
    group_dns = []
    for dn in user.cached_groups:
        if dn:
            # Normalize: strip whitespace, handle None/empty values
            normalized = str(dn).strip()
            if normalized:
                group_dns.append(normalized)
    
    if not group_dns:
        current_app.logger.debug(f"User {user.uid} has no valid group DNs after normalization")
        return []
    
    current_app.logger.debug(f"User {user.uid} role lookup: checking {len(group_dns)} groups")
    
    # First, try exact match (case-sensitive)
    groups = LDAPGroup.query.filter(LDAPGroup.dn.in_(group_dns)).all()
    group_ids = [g.id for g in groups]
    matched_dns = {g.dn for g in groups}
    
    # If we didn't match all groups, try case-insensitive matching for the rest
    unmatched_dns = [dn for dn in group_dns if dn not in matched_dns]
    
    if unmatched_dns:
        current_app.logger.debug(
            f"User {user.uid}: {len(unmatched_dns)} groups not found with exact match, "
            f"trying case-insensitive match"
        )
        
        for cached_dn in unmatched_dns:
            # Try case-insensitive match
            case_insensitive = LDAPGroup.query.filter(
                func.lower(LDAPGroup.dn) == func.lower(cached_dn)
            ).first()
            
            if case_insensitive:
                current_app.logger.info(
                    f"User {user.uid}: Found group with case-insensitive match: "
                    f"'{cached_dn}' -> '{case_insensitive.dn}'"
                )
                groups.append(case_insensitive)
                group_ids.append(case_insensitive.id)
            else:
                current_app.logger.warning(
                    f"User {user.uid}: Group DN not found in database: '{cached_dn}'"
                )
    
    if not group_ids:
        # Log detailed debugging info
        all_groups_in_db = [g.dn for g in LDAPGroup.query.all()]
        current_app.logger.warning(
            f"User {user.uid} has groups in cached_groups but none found in DB. "
            f"Cached groups ({len(group_dns)}): {group_dns[:3]}..., "
            f"Groups in DB (sample): {all_groups_in_db[:3] if all_groups_in_db else 'None'}..."
        )
        return []
    
    # Get role mappings for matched groups
    mappings = RoleMapping.query.filter(RoleMapping.ldap_group_id.in_(group_ids)).all()
    role_ids = [m.role_id for m in mappings]
    
    if not role_ids:
        # Log detailed info about why no roles were found
        group_names = [g.cn or g.dn for g in groups]
        current_app.logger.warning(
            f"User {user.uid} has {len(groups)} matched groups but no role mappings. "
            f"Group IDs: {group_ids}, Group names: {group_names}"
        )
        return []
    
    roles = Role.query.filter(Role.id.in_(role_ids)).all()
    role_names = [r.name for r in roles]
    
    current_app.logger.debug(
        f"User {user.uid} role lookup: found {len(role_names)} roles: {role_names}"
    )
    
    return role_names


def has_role(user_id, role_name):
    """Check if user has a specific role."""
    roles = get_user_roles(user_id)
    return role_name in roles


def require_role(*role_names):
    """
    Decorator to require one of the specified roles.
    
    Usage:
        @require_role('admin')
        def admin_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'error': 'Authentication required'}), 401
            
            user = User.query.get(user_id)
            if not user or user.disabled:
                return jsonify({'error': 'User not found or disabled'}), 401
            
            # Check if user is local admin (bypasses role check)
            if user.is_local_admin:
                return f(*args, **kwargs)
            
            # Check roles
            user_roles = get_user_roles(user_id)
            if not any(role in user_roles for role in role_names):
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_admin(f):
    """Decorator to require admin role."""
    return require_role('admin')(f)

