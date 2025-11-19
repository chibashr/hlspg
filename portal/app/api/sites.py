"""User-facing sites endpoint."""
from flask import jsonify, session
from . import api_bp
from ..db import db
from ..models import User, Site, GroupSiteMap, LDAPGroup
from ..utils.rbac import get_user_roles


@api_bp.route('/sites', methods=['GET'])
def get_accessible_sites():
    """Get sites accessible to the current user."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return jsonify({'error': 'User not found or disabled'}), 401
    
    # Get user's groups
    user_groups = user.cached_groups or []
    
    if not user_groups:
        # No groups, return empty list
        return jsonify({'sites': []}), 200
    
    # Normalize group DNs (strip whitespace) for matching
    normalized_groups = [str(dn).strip() for dn in user_groups if dn]
    
    if not normalized_groups:
        return jsonify({'sites': []}), 200
    
    # Find LDAP groups - try exact match first
    from sqlalchemy import func
    ldap_groups = LDAPGroup.query.filter(LDAPGroup.dn.in_(normalized_groups)).all()
    matched_dns = {g.dn for g in ldap_groups}
    
    # If we didn't match all groups, try case-insensitive matching for the rest
    unmatched_groups = [dn for dn in normalized_groups if dn not in matched_dns]
    
    if unmatched_groups:
        for cached_dn in unmatched_groups:
            # Try case-insensitive match
            case_insensitive = LDAPGroup.query.filter(
                func.lower(LDAPGroup.dn) == func.lower(cached_dn)
            ).first()
            if case_insensitive:
                ldap_groups.append(case_insensitive)
    
    group_ids = [g.id for g in ldap_groups]
    
    if not group_ids:
        return jsonify({'sites': []}), 200
    
    # Find sites mapped to these groups
    mappings = GroupSiteMap.query.filter(GroupSiteMap.ldap_group_id.in_(group_ids)).all()
    site_ids = [m.site_id for m in mappings]
    
    # Get visible sites
    sites = Site.query.filter(
        Site.id.in_(site_ids),
        Site.visible == True
    ).all()
    
    return jsonify({
        'sites': [{
            'id': s.id,
            'name': s.name,
            'url': s.url,
            'description': s.description,
            'health_url': s.health_url,
            'access_methods': s.access_methods or [],
            'proxy_url': s.proxy_url,
            'sign_on_method': s.sign_on_method
        } for s in sites]
    }), 200

