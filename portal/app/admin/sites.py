"""Site management endpoints."""
from flask import request, jsonify
from . import admin_bp
from ..db import db
from ..models import Site, GroupSiteMap, LDAPGroup
from ..utils.rbac import require_admin
from ..utils.security import validate_proxied_url


@admin_bp.route('/sites', methods=['GET'])
@require_admin
def list_sites():
    """List all sites."""
    sites = Site.query.all()
    return jsonify({
        'sites': [{
            'id': s.id,
            'name': s.name,
            'url': s.url,
            'description': s.description,
            'visible': s.visible,
            'health_url': s.health_url,
            'owner': s.owner,
            'ssh_path': s.ssh_path,
            'access_methods': s.access_methods or [],
            'proxy_url': s.proxy_url,
            'sign_on_method': s.sign_on_method,
            'created_at': s.created_at.isoformat() if s.created_at else None
        } for s in sites]
    }), 200


@admin_bp.route('/sites', methods=['POST'])
@require_admin
def create_site():
    """Create a site."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    name = data.get('name')
    url = data.get('url')
    
    if not name or not url:
        return jsonify({'error': 'name and url required'}), 400
    
    # Validate URL is in allowed hosts
    if not validate_proxied_url(url):
        return jsonify({'error': 'URL not in allowed proxied hosts'}), 400
    
    # Check if site with URL already exists
    existing = Site.query.filter_by(url=url).first()
    if existing:
        return jsonify({'error': 'Site with this URL already exists'}), 409
    
    site = Site(
        name=name,
        url=url,
        description=data.get('description'),
        visible=data.get('visible', True),
        health_url=data.get('health_url'),
        owner=data.get('owner'),
        ssh_path=data.get('ssh_path'),
        access_methods=data.get('access_methods', []),
        proxy_url=data.get('proxy_url'),
        sign_on_method=data.get('sign_on_method')
    )
    
    db.session.add(site)
    db.session.commit()
    
    return jsonify({
        'id': site.id,
        'name': site.name,
        'url': site.url,
        'description': site.description,
        'visible': site.visible,
        'access_methods': site.access_methods or [],
        'proxy_url': site.proxy_url,
        'sign_on_method': site.sign_on_method
    }), 201


@admin_bp.route('/sites/<int:site_id>', methods=['GET'])
@require_admin
def get_site(site_id):
    """Get a site."""
    from ..models import RoleMapping, Role
    
    site = Site.query.get_or_404(site_id)
    
    # Get associated groups
    mappings = GroupSiteMap.query.filter_by(site_id=site_id).all()
    groups = [{
        'id': m.ldap_group.id,
        'dn': m.ldap_group.dn,
        'cn': m.ldap_group.cn
    } for m in mappings]
    
    # Get roles that have access through these groups
    group_ids = [m.ldap_group_id for m in mappings]
    role_mappings = RoleMapping.query.filter(RoleMapping.ldap_group_id.in_(group_ids)).all() if group_ids else []
    role_ids = list(set([rm.role_id for rm in role_mappings]))
    roles = Role.query.filter(Role.id.in_(role_ids)).all() if role_ids else []
    
    return jsonify({
        'id': site.id,
        'name': site.name,
        'url': site.url,
        'description': site.description,
        'visible': site.visible,
        'health_url': site.health_url,
        'owner': site.owner,
        'ssh_path': site.ssh_path,
        'access_methods': site.access_methods or [],
        'proxy_url': site.proxy_url,
        'sign_on_method': site.sign_on_method,
        'groups': groups,
        'roles': [{
            'id': r.id,
            'name': r.name,
            'description': r.description
        } for r in roles]
    }), 200


@admin_bp.route('/sites/<int:site_id>', methods=['PUT'])
@require_admin
def update_site(site_id):
    """Update a site."""
    site = Site.query.get_or_404(site_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    if 'name' in data:
        site.name = data['name']
    if 'url' in data:
        new_url = data['url']
        if not validate_proxied_url(new_url):
            return jsonify({'error': 'URL not in allowed proxied hosts'}), 400
        # Check for duplicate URL
        existing = Site.query.filter_by(url=new_url).filter(Site.id != site_id).first()
        if existing:
            return jsonify({'error': 'Site with this URL already exists'}), 409
        site.url = new_url
    if 'description' in data:
        site.description = data['description']
    if 'visible' in data:
        site.visible = data['visible']
    if 'health_url' in data:
        site.health_url = data['health_url']
    if 'owner' in data:
        site.owner = data['owner']
    if 'ssh_path' in data:
        site.ssh_path = data['ssh_path']
    if 'access_methods' in data:
        site.access_methods = data['access_methods'] if isinstance(data['access_methods'], list) else []
    if 'proxy_url' in data:
        site.proxy_url = data['proxy_url'] or None
    if 'sign_on_method' in data:
        site.sign_on_method = data['sign_on_method'] or None
    
    db.session.commit()
    
    return jsonify({
        'id': site.id,
        'name': site.name,
        'url': site.url,
        'description': site.description,
        'visible': site.visible,
        'ssh_path': site.ssh_path,
        'access_methods': site.access_methods or [],
        'proxy_url': site.proxy_url,
        'sign_on_method': site.sign_on_method
    }), 200


@admin_bp.route('/sites/<int:site_id>', methods=['DELETE'])
@require_admin
def delete_site(site_id):
    """Delete a site."""
    site = Site.query.get_or_404(site_id)
    db.session.delete(site)
    db.session.commit()
    
    return jsonify({'ok': True}), 200


@admin_bp.route('/sites/<int:site_id>/groups', methods=['POST'])
@require_admin
def add_site_group(site_id):
    """Add a group to a site."""
    site = Site.query.get_or_404(site_id)
    data = request.get_json()
    
    if not data or 'group_dn' not in data:
        return jsonify({'error': 'group_dn required'}), 400
    
    group_dn = data['group_dn']
    group = LDAPGroup.query.filter_by(dn=group_dn).first()
    
    if not group:
        from ..ldap.group_sync import sync_group_to_db
        group = sync_group_to_db(group_dn)
    
    # Check if mapping exists
    existing = GroupSiteMap.query.filter_by(
        site_id=site_id,
        ldap_group_id=group.id
    ).first()
    
    if existing:
        return jsonify({'error': 'Group already mapped to site'}), 409
    
    mapping = GroupSiteMap(site_id=site_id, ldap_group_id=group.id)
    db.session.add(mapping)
    db.session.commit()
    
    return jsonify({'ok': True}), 201


@admin_bp.route('/sites/<int:site_id>/groups/<int:group_id>', methods=['DELETE'])
@require_admin
def remove_site_group(site_id, group_id):
    """Remove a group from a site."""
    mapping = GroupSiteMap.query.filter_by(
        site_id=site_id,
        ldap_group_id=group_id
    ).first_or_404()
    
    db.session.delete(mapping)
    db.session.commit()
    
    return jsonify({'ok': True}), 200

