"""Certificate management endpoints."""
from flask import request, jsonify, send_file, session
from io import BytesIO
from pathlib import Path
from werkzeug.utils import secure_filename
from . import admin_bp
from ..db import db
from ..models import Certificate, AuditLog, User
from ..utils.rbac import require_admin


@admin_bp.route('/certificates', methods=['GET'])
@require_admin
def list_certificates():
    """List all certificates."""
    certificates = Certificate.query.order_by(Certificate.created_at.desc()).all()
    return jsonify({
        'certificates': [{
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'filename': c.filename,
            'enabled': c.enabled,
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'updated_at': c.updated_at.isoformat() if c.updated_at else None
        } for c in certificates]
    }), 200


@admin_bp.route('/certificates/upload', methods=['POST'])
@require_admin
def upload_certificate():
    """Upload a certificate file (PEM or CRT)."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file extension
    if not file.filename.lower().endswith(('.pem', '.crt', '.cer', '.cert')):
        return jsonify({'error': 'Invalid file type. Only .pem, .crt, .cer, .cert files are allowed'}), 400
    
    # Get form data
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    enabled = request.form.get('enabled', 'true').lower() == 'true'
    
    if not name:
        # Use filename as default name if not provided
        name = Path(file.filename).stem
    
    # Read and validate certificate data
    try:
        certificate_data = file.read().decode('utf-8').strip()
    except UnicodeDecodeError:
        return jsonify({'error': 'Invalid file encoding. Certificate must be text-based (PEM format)'}), 400
    
    # Validate certificate format
    if not (certificate_data.startswith('-----BEGIN') and '-----END' in certificate_data):
        return jsonify({'error': 'Invalid certificate format. File must be in PEM format (-----BEGIN ... -----END ...)'}), 400
    
    # Use original filename or derive from name
    filename = request.form.get('filename', '').strip() or file.filename
    
    certificate = Certificate(
        name=name,
        description=description,
        certificate_data=certificate_data,
        filename=filename,
        enabled=enabled
    )
    
    db.session.add(certificate)
    
    # Log the action
    user_id = session.get('user_id')
    if user_id:
        audit_log = AuditLog(
            user_id=user_id,
            ip=request.remote_addr,
            action='certificate_created',
            details={'certificate_id': certificate.id, 'name': name, 'source': 'file_upload'}
        )
        db.session.add(audit_log)
    
    db.session.commit()
    
    return jsonify({
        'id': certificate.id,
        'name': certificate.name,
        'description': certificate.description,
        'filename': certificate.filename,
        'enabled': certificate.enabled,
        'created_at': certificate.created_at.isoformat() if certificate.created_at else None,
        'updated_at': certificate.updated_at.isoformat() if certificate.updated_at else None
    }), 201


@admin_bp.route('/certificates', methods=['POST'])
@require_admin
def create_certificate():
    """Create a certificate from pasted data."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    certificate_data = data.get('certificate_data', '').strip()
    filename = (data.get('filename') or '').strip()
    enabled = data.get('enabled', True)
    
    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not certificate_data:
        return jsonify({'error': 'certificate_data is required'}), 400
    if not filename:
        return jsonify({'error': 'filename is required'}), 400
    
    # Validate certificate data format (basic check for PEM format)
    if not (certificate_data.startswith('-----BEGIN') and '-----END' in certificate_data):
        return jsonify({'error': 'certificate_data must be in PEM format (-----BEGIN ... -----END ...)'}), 400
    
    certificate = Certificate(
        name=name,
        description=description,
        certificate_data=certificate_data,
        filename=filename,
        enabled=enabled
    )
    
    db.session.add(certificate)
    
    # Log the action
    user_id = session.get('user_id')
    if user_id:
        audit_log = AuditLog(
            user_id=user_id,
            ip=request.remote_addr,
            action='certificate_created',
            details={'certificate_id': certificate.id, 'name': name}
        )
        db.session.add(audit_log)
    
    db.session.commit()
    
    return jsonify({
        'id': certificate.id,
        'name': certificate.name,
        'description': certificate.description,
        'filename': certificate.filename,
        'enabled': certificate.enabled,
        'created_at': certificate.created_at.isoformat() if certificate.created_at else None,
        'updated_at': certificate.updated_at.isoformat() if certificate.updated_at else None
    }), 201


@admin_bp.route('/certificates/<int:certificate_id>', methods=['GET'])
@require_admin
def get_certificate(certificate_id):
    """Get a certificate by ID."""
    certificate = Certificate.query.get_or_404(certificate_id)
    return jsonify({
        'id': certificate.id,
        'name': certificate.name,
        'description': certificate.description,
        'certificate_data': certificate.certificate_data,
        'filename': certificate.filename,
        'enabled': certificate.enabled,
        'created_at': certificate.created_at.isoformat() if certificate.created_at else None,
        'updated_at': certificate.updated_at.isoformat() if certificate.updated_at else None
    }), 200


@admin_bp.route('/certificates/<int:certificate_id>', methods=['PUT'])
@require_admin
def update_certificate(certificate_id):
    """Update a certificate."""
    certificate = Certificate.query.get_or_404(certificate_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    if 'name' in data:
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'name cannot be empty'}), 400
        certificate.name = name
    
    if 'description' in data:
        certificate.description = (data.get('description') or '').strip()
    
    if 'certificate_data' in data:
        certificate_data = data.get('certificate_data', '').strip()
        if not certificate_data:
            return jsonify({'error': 'certificate_data cannot be empty'}), 400
        # Validate certificate data format
        if not (certificate_data.startswith('-----BEGIN') and '-----END' in certificate_data):
            return jsonify({'error': 'certificate_data must be in PEM format (-----BEGIN ... -----END ...)'}), 400
        certificate.certificate_data = certificate_data
    
    if 'filename' in data:
        filename = (data.get('filename') or '').strip()
        if not filename:
            return jsonify({'error': 'filename cannot be empty'}), 400
        certificate.filename = filename
    
    if 'enabled' in data:
        certificate.enabled = bool(data.get('enabled'))
    
    # Log the action
    user_id = session.get('user_id')
    if user_id:
        audit_log = AuditLog(
            user_id=user_id,
            ip=request.remote_addr,
            action='certificate_updated',
            details={'certificate_id': certificate.id, 'name': certificate.name}
        )
        db.session.add(audit_log)
    
    db.session.commit()
    
    return jsonify({
        'id': certificate.id,
        'name': certificate.name,
        'description': certificate.description,
        'filename': certificate.filename,
        'enabled': certificate.enabled,
        'created_at': certificate.created_at.isoformat() if certificate.created_at else None,
        'updated_at': certificate.updated_at.isoformat() if certificate.updated_at else None
    }), 200


@admin_bp.route('/certificates/<int:certificate_id>', methods=['DELETE'])
@require_admin
def delete_certificate(certificate_id):
    """Delete a certificate."""
    certificate = Certificate.query.get_or_404(certificate_id)
    name = certificate.name
    
    # Log the action
    user_id = session.get('user_id')
    if user_id:
        audit_log = AuditLog(
            user_id=user_id,
            ip=request.remote_addr,
            action='certificate_deleted',
            details={'certificate_id': certificate.id, 'name': name}
        )
        db.session.add(audit_log)
    
    db.session.delete(certificate)
    db.session.commit()
    
    return jsonify({'message': 'Certificate deleted successfully'}), 200

