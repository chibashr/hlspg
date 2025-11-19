"""Audit log endpoints."""
from flask import request, jsonify
from datetime import datetime, timedelta
from . import admin_bp
from ..db import db
from ..models import AuditLog
from ..utils.rbac import require_admin


@admin_bp.route('/audit', methods=['GET'])
@require_admin
def get_audit_logs():
    """Query audit logs."""
    # Parse query parameters
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', type=int, default=100)
    offset = request.args.get('offset', type=int, default=0)
    
    # Build query
    query = AuditLog.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    if action:
        query = query.filter_by(action=action)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.ts >= start_dt)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format'}), 400
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.ts <= end_dt)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format'}), 400
    
    # Order by timestamp descending
    query = query.order_by(AuditLog.ts.desc())
    
    # Apply pagination
    total = query.count()
    logs = query.limit(limit).offset(offset).all()
    
    return jsonify({
        'logs': [{
            'id': log.id,
            'ts': log.ts.isoformat() if log.ts else None,
            'user_id': log.user_id,
            'ip': log.ip,
            'action': log.action,
            'details': log.details
        } for log in logs],
        'total': total,
        'limit': limit,
        'offset': offset
    }), 200


@admin_bp.route('/audit/<int:log_id>', methods=['GET'])
@require_admin
def get_audit_log(log_id):
    """Get a specific audit log entry."""
    log = AuditLog.query.get_or_404(log_id)
    return jsonify({
        'id': log.id,
        'ts': log.ts.isoformat() if log.ts else None,
        'user_id': log.user_id,
        'ip': log.ip,
        'action': log.action,
        'details': log.details
    }), 200

