"""User certificate endpoints."""
from flask import jsonify, request, send_file, session
from io import BytesIO
from . import api_bp
from ..db import db
from ..models import User, Certificate


def _require_user():
    """Helper to fetch authenticated user or return error response."""
    user_id = session.get('user_id')
    if not user_id:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return None, (jsonify({'error': 'User not found or disabled'}), 401)
    
    return user, None


@api_bp.route('/certificates', methods=['GET'])
def list_certificates():
    """List all enabled certificates available to users."""
    user, error = _require_user()
    if error:
        return error
    
    try:
        certificates = Certificate.query.filter_by(enabled=True).order_by(Certificate.name).all()
    except Exception as e:
        # Handle case where certificates table doesn't exist yet (migration not run)
        # Return empty list instead of error
        return jsonify({
            'certificates': []
        }), 200
    
    return jsonify({
        'certificates': [{
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'filename': c.filename,
            'created_at': c.created_at.isoformat() if c.created_at else None
        } for c in certificates]
    }), 200


@api_bp.route('/certificates/<int:certificate_id>', methods=['GET'])
def get_certificate(certificate_id):
    """Get certificate details (without data)."""
    user, error = _require_user()
    if error:
        return error
    
    try:
        certificate = Certificate.query.filter_by(id=certificate_id, enabled=True).first_or_404()
    except Exception as e:
        return jsonify({'error': 'Certificate not found'}), 404
    
    return jsonify({
        'id': certificate.id,
        'name': certificate.name,
        'description': certificate.description,
        'filename': certificate.filename,
        'created_at': certificate.created_at.isoformat() if certificate.created_at else None
    }), 200


@api_bp.route('/certificates/<int:certificate_id>/download', methods=['GET'])
def download_certificate(certificate_id):
    """Download a certificate file."""
    user, error = _require_user()
    if error:
        return error
    
    try:
        certificate = Certificate.query.filter_by(id=certificate_id, enabled=True).first_or_404()
    except Exception as e:
        return jsonify({'error': 'Certificate not found'}), 404
    
    # Create a BytesIO object with the certificate data
    cert_file = BytesIO(certificate.certificate_data.encode('utf-8'))
    
    return send_file(
        cert_file,
        mimetype='application/x-pem-file',
        as_attachment=True,
        download_name=certificate.filename
    )

