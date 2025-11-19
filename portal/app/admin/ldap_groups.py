"""LDAP group search and discovery endpoints."""
from flask import request, jsonify, current_app
from . import admin_bp
from ..utils.rbac import require_admin
from ..ldap.connector import get_ldap_connection, LDAPConnectionError
from ..ldap.config_helper import get_ldap_config
from ..ldap.group_sync import sync_group_to_db
from ..db import db


@admin_bp.route('/ldap-groups/search', methods=['POST'])
@require_admin
def search_ldap_groups():
    """Search for groups in LDAP using the configured filter."""
    data = request.get_json() or {}
    search_term = data.get('search', '').strip()
    
    ldap_config = get_ldap_config()
    
    bind_dn = ldap_config.get('ldap_bind_dn')
    bind_pw = ldap_config.get('ldap_bind_password')
    # Use group_dn if specified, otherwise fall back to base_dn
    group_dn = ldap_config.get('ldap_group_dn') or ldap_config.get('ldap_base_dn')
    base_dn = ldap_config.get('ldap_base_dn')
    group_filter = ldap_config.get('ldap_group_filter')
    search_timeout = ldap_config.get('ldap_search_timeout', 5)
    
    if not group_dn:
        return jsonify({
            'error': 'LDAP_GROUP_DN or LDAP_BASE_DN must be configured'
        }), 400
    
    # Use default group filter if not configured
    if not group_filter:
        group_filter = '(objectClass=group)'
    
    # Build search filter
    if search_term:
        # Add search term to filter (search in cn, name, description)
        search_filter = f'(&{group_filter}(|(cn=*{search_term}*)(name=*{search_term}*)(description=*{search_term}*)))'
    else:
        search_filter = group_filter
    
    try:
        conn = get_ldap_connection(bind_dn=bind_dn, bind_pw=bind_pw)
        
        # Search for groups in the group DN
        conn.search(
            search_base=group_dn,
            search_filter=search_filter,
            attributes=['cn', 'name', 'description', 'distinguishedName'],
            size_limit=100,  # Limit results
            time_limit=search_timeout
        )
        
        groups = []
        for entry in conn.entries:
            dn = str(entry.entry_dn)
            cn = str(entry.cn) if 'cn' in entry else (str(entry.name) if 'name' in entry else None)
            description = str(entry.description) if 'description' in entry else None
            
            # Sync group to database
            group = sync_group_to_db(dn, cn=cn, description=description)
            
            groups.append({
                'id': group.id,
                'dn': dn,
                'cn': cn or dn,
                'description': description
            })
        
        conn.unbind()
        
        return jsonify({
            'groups': groups,
            'count': len(groups)
        }), 200
        
    except LDAPConnectionError as e:
        return jsonify({
            'error': f'LDAP connection failed: {str(e)}'
        }), 400
    except Exception as e:
        current_app.logger.error(f'Group search failed: {str(e)}', exc_info=True)
        return jsonify({
            'error': f'Group search failed: {str(e)}'
        }), 500

