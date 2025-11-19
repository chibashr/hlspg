"""Role mapping management endpoints."""
from flask import request, jsonify
from . import admin_bp
from ..db import db
from ..models import Role, LDAPGroup, RoleMapping
from ..utils.rbac import require_admin
from ..ldap.group_sync import sync_group_to_db


@admin_bp.route('/role-mappings', methods=['GET'])
@require_admin
def list_role_mappings():
    """List all role mappings."""
    mappings = RoleMapping.query.all()
    
    return jsonify({
        'mappings': [{
            'id': m.id,
            'ldap_group': {
                'id': m.ldap_group.id,
                'dn': m.ldap_group.dn,
                'cn': m.ldap_group.cn
            },
            'role': {
                'id': m.role.id,
                'name': m.role.name,
                'description': m.role.description
            }
        } for m in mappings]
    }), 200


@admin_bp.route('/role-mappings', methods=['POST'])
@require_admin
def create_role_mapping():
    """Create a role mapping."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    group_dn = data.get('ldap_group_dn')
    role_name = data.get('role_name')
    
    if not group_dn or not role_name:
        return jsonify({'error': 'ldap_group_dn and role_name required'}), 400
    
    # Get or create LDAP group
    group = LDAPGroup.query.filter_by(dn=group_dn).first()
    if not group:
        group = sync_group_to_db(group_dn)
    
    # Get role
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify({'error': f'Role "{role_name}" not found'}), 404
    
    # Check if mapping already exists
    existing = RoleMapping.query.filter_by(
        ldap_group_id=group.id,
        role_id=role.id
    ).first()
    
    if existing:
        return jsonify({'error': 'Role mapping already exists'}), 409
    
    # Create mapping
    mapping = RoleMapping(ldap_group_id=group.id, role_id=role.id)
    db.session.add(mapping)
    db.session.commit()
    
    return jsonify({
        'id': mapping.id,
        'ldap_group': {
            'id': group.id,
            'dn': group.dn,
            'cn': group.cn
        },
        'role': {
            'id': role.id,
            'name': role.name
        }
    }), 201


@admin_bp.route('/role-mappings/<int:mapping_id>', methods=['DELETE'])
@require_admin
def delete_role_mapping(mapping_id):
    """Delete a role mapping."""
    mapping = RoleMapping.query.get_or_404(mapping_id)
    db.session.delete(mapping)
    db.session.commit()
    
    return jsonify({'ok': True}), 200


@admin_bp.route('/roles', methods=['GET'])
@require_admin
def list_roles():
    """List all roles."""
    roles = Role.query.all()
    return jsonify({
        'roles': [{
            'id': r.id,
            'name': r.name,
            'description': r.description
        } for r in roles]
    }), 200


@admin_bp.route('/ldap-groups', methods=['GET'])
@require_admin
def list_ldap_groups():
    """List all cached LDAP groups."""
    groups = LDAPGroup.query.all()
    return jsonify({
        'groups': [{
            'id': g.id,
            'dn': g.dn,
            'cn': g.cn,
            'description': g.description,
            'last_seen': g.last_seen.isoformat() if g.last_seen else None
        } for g in groups]
    }), 200

