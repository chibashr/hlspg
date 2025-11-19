"""User credential management endpoints."""
from flask import jsonify, request, session
from . import api_bp
from ..db import db
from ..models import User, UserCredential, Site

ALLOWED_CREDENTIAL_TYPES = {'ssh_key', 'certificate', 'password'}


def _require_user():
    """Helper to fetch authenticated user or return error response."""
    user_id = session.get('user_id')
    if not user_id:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return None, (jsonify({'error': 'User not found or disabled'}), 401)
    
    return user, None


@api_bp.route('/credentials', methods=['GET'])
def list_credentials():
    """List credentials for the current user."""
    user, error = _require_user()
    if error:
        return error
    
    credentials = UserCredential.query.filter_by(user_id=user.id).order_by(UserCredential.created_at.desc()).all()
    return jsonify({
        'credentials': [{
            'id': cred.id,
            'name': cred.name,
            'credential_type': cred.credential_type,
            'created_at': cred.created_at.isoformat() if cred.created_at else None,
            'associated_site_ids': [site.id for site in cred.associated_sites],
            'associated_sites': [{'id': site.id, 'name': site.name} for site in cred.associated_sites]
        } for cred in credentials]
    }), 200


@api_bp.route('/credentials', methods=['POST'])
def create_credential():
    """Create a credential for the current user."""
    user, error = _require_user()
    if error:
        return error
    
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    credential_type = (data.get('credential_type') or '').strip()
    value = data.get('data')
    site_ids = data.get('site_ids', [])
    
    if not name or not credential_type or not value:
        return jsonify({'error': 'name, credential_type, and data are required'}), 400
    
    if credential_type not in ALLOWED_CREDENTIAL_TYPES:
        return jsonify({'error': f'credential_type must be one of {sorted(ALLOWED_CREDENTIAL_TYPES)}'}), 400
    
    credential = UserCredential(
        user_id=user.id,
        credential_type=credential_type,
        name=name,
        data=value
    )
    
    # Associate with sites if provided
    if site_ids:
        sites = Site.query.filter(Site.id.in_(site_ids)).all()
        # Verify user has access to these sites (optional: check group access)
        credential.associated_sites = sites
    
    db.session.add(credential)
    db.session.commit()
    
    return jsonify({
        'id': credential.id,
        'name': credential.name,
        'credential_type': credential.credential_type,
        'created_at': credential.created_at.isoformat() if credential.created_at else None,
        'associated_site_ids': [site.id for site in credential.associated_sites],
        'associated_sites': [{'id': site.id, 'name': site.name} for site in credential.associated_sites]
    }), 201


@api_bp.route('/credentials/<int:credential_id>', methods=['PUT'])
def update_credential(credential_id):
    """Update a credential owned by the current user."""
    user, error = _require_user()
    if error:
        return error
    
    credential = UserCredential.query.filter_by(id=credential_id, user_id=user.id).first()
    if not credential:
        return jsonify({'error': 'Credential not found'}), 404
    
    data = request.get_json() or {}
    
    # Update name if provided
    if 'name' in data:
        name = (data.get('name') or '').strip()
        if name:
            credential.name = name
    
    # Update data if provided
    if 'data' in data:
        credential.data = data.get('data')
    
    # Update site associations if provided
    if 'site_ids' in data:
        site_ids = data.get('site_ids', [])
        if site_ids:
            sites = Site.query.filter(Site.id.in_(site_ids)).all()
            credential.associated_sites = sites
        else:
            credential.associated_sites = []
    
    db.session.commit()
    
    return jsonify({
        'id': credential.id,
        'name': credential.name,
        'credential_type': credential.credential_type,
        'created_at': credential.created_at.isoformat() if credential.created_at else None,
        'associated_site_ids': [site.id for site in credential.associated_sites],
        'associated_sites': [{'id': site.id, 'name': site.name} for site in credential.associated_sites]
    }), 200


@api_bp.route('/credentials/<int:credential_id>', methods=['DELETE'])
def delete_credential(credential_id):
    """Delete a credential owned by the current user."""
    user, error = _require_user()
    if error:
        return error
    
    credential = UserCredential.query.filter_by(id=credential_id, user_id=user.id).first()
    if not credential:
        return jsonify({'error': 'Credential not found'}), 404
    
    db.session.delete(credential)
    db.session.commit()
    return jsonify({'ok': True}), 200

