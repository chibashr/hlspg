"""Authentication routes."""
from flask import request, jsonify, session
from datetime import datetime
from . import auth_bp
from ..db import db
from ..models import User, AuditLog
from ..ldap import authenticate_user, get_user_groups, sync_group_to_db
from ..ldap.connector import LDAPConnectionError
from ..utils.security import rate_limit
from ..utils.rbac import get_user_roles
from ..config import Config


@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=5, period=60, key_func=lambda: f"rate_limit:login:{request.remote_addr}")
def login():
    """Login endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    ip_address = request.remote_addr
    
    # Try LDAP authentication first
    # Check if LDAP is configured (either in DB or env vars)
    from flask import current_app
    from ..models import LDAPConfig
    
    user_data = None
    ldap_success = False
    ldap_configured = False
    ldap_error = None
    
    # Check if LDAP is configured in database
    db_ldap_config = LDAPConfig.query.filter_by(id=1, enabled=True).first()
    if db_ldap_config and db_ldap_config.ldap_url:
        ldap_configured = True
        current_app.logger.info(f"LDAP login attempt for user '{username}': Using database LDAP config")
    elif Config.LDAP_URL:
        ldap_configured = True
        current_app.logger.info(f"LDAP login attempt for user '{username}': Using environment LDAP config")
    else:
        current_app.logger.debug(f"LDAP not configured, skipping LDAP authentication for user '{username}'")
    
    if ldap_configured:
        try:
            current_app.logger.debug(f"Attempting LDAP authentication for user '{username}'")
            user_data = authenticate_user(username, password)
            ldap_success = True
            current_app.logger.info(f"LDAP authentication successful for user '{username}'")
        except LDAPConnectionError as e:
            # LDAP connection failed - log and try fallback if enabled
            ldap_error = str(e)
            current_app.logger.warning(
                f"LDAP connection failed for user '{username}': {ldap_error}"
            )
            if not Config.ALLOW_LOCAL_FALLBACK:
                log_audit_event(None, ip_address, 'login_failed', {
                    'username': username,
                    'reason': 'LDAP connection failed',
                    'error': ldap_error
                })
                return jsonify({'error': 'Authentication service unavailable'}), 503
        except ValueError as e:
            # Authentication failed (invalid credentials or user not found)
            ldap_error = str(e)
            current_app.logger.warning(
                f"LDAP authentication failed for user '{username}': {ldap_error}"
            )
            # Will try fallback if enabled
    
    # Try local admin fallback
    if not ldap_success and Config.ALLOW_LOCAL_FALLBACK:
        user = User.query.filter_by(uid=username, is_local_admin=True, disabled=False).first()
        if user:
            # Verify password for local admin
            from ..utils.security import verify_password
            if user.password_hash and verify_password(password, user.password_hash):
                user_data = {
                    'dn': None,
                    'uid': username,
                    'cn': user.display_name or username,
                    'mail': user.email or '',
                    'memberOf': []
                }
                ldap_success = True
            elif not user.password_hash:
                # Legacy: if no password hash, allow login (for existing setups)
                # This should be removed after initial migration
                user_data = {
                    'dn': None,
                    'uid': username,
                    'cn': user.display_name or username,
                    'mail': user.email or '',
                    'memberOf': []
                }
                ldap_success = True
    
    if not ldap_success or not user_data:
        # Log failure with details
        failure_details = {'username': username}
        if ldap_configured:
            failure_details['ldap_attempted'] = True
            if ldap_error:
                failure_details['ldap_error'] = ldap_error
        else:
            failure_details['ldap_attempted'] = False
            failure_details['reason'] = 'LDAP not configured'
        
        current_app.logger.warning(
            f"Login failed for user '{username}': "
            f"LDAP configured={ldap_configured}, "
            f"LDAP attempted={ldap_configured}, "
            f"LDAP success={ldap_success}, "
            f"Error={ldap_error or 'N/A'}"
        )
        
        log_audit_event(None, ip_address, 'login_failed', failure_details)
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Get or create user record
    user = User.query.filter_by(uid=user_data['uid']).first()
    
    if not user:
        user = User(
            uid=user_data['uid'],
            dn=user_data.get('dn'),
            display_name=user_data.get('displayName') or user_data.get('cn') or username,
            email=user_data.get('mail') or '',
            is_local_admin=False,
            disabled=False
        )
        db.session.add(user)
    else:
        # Update user info
        user.display_name = user_data.get('displayName') or user_data.get('cn') or user.display_name
        user.email = user_data.get('mail') or user.email
        user.dn = user_data.get('dn') or user.dn
    
    # Refresh groups from LDAP using enhanced lookup (forward + reverse)
    if ldap_success and user_data.get('dn'):
        # Use enhanced get_user_groups which does both forward and reverse lookup
        # This ensures we get all groups, not just those in memberOf attribute
        try:
            group_dns = get_user_groups(username)
            current_app.logger.info(f"User {username} groups from enhanced lookup: {group_dns} ({len(group_dns)} groups)")
            
            # Sync groups to database (normalize DNs - strip whitespace)
            normalized_group_dns = []
            for group_dn in group_dns:
                # Normalize DN: strip whitespace and ensure consistent format
                normalized_dn = str(group_dn).strip()
                if normalized_dn:  # Only add non-empty DNs
                    normalized_group_dns.append(normalized_dn)
                    # Sync group to database - ensure it's committed before role lookup
                    try:
                        sync_group_to_db(normalized_dn)
                        current_app.logger.debug(f"Synced group to DB: {normalized_dn}")
                    except Exception as e:
                        current_app.logger.error(f"Failed to sync group {normalized_dn}: {str(e)}")
            
            user.cached_groups = normalized_group_dns
            current_app.logger.info(
                f"User {username} cached groups after normalization: {normalized_group_dns} "
                f"({len(normalized_group_dns)} groups)"
            )
        except Exception as e:
            current_app.logger.error(f"Failed to get groups for user {username}: {str(e)}")
            # Fallback to memberOf if enhanced lookup fails
            member_of_groups = user_data.get('memberOf', [])
            if member_of_groups:
                normalized_group_dns = [str(g).strip() for g in member_of_groups if str(g).strip()]
                user.cached_groups = normalized_group_dns
                current_app.logger.warning(
                    f"User {username}: Using fallback memberOf groups ({len(normalized_group_dns)} groups) "
                    f"due to enhanced lookup failure"
                )
            else:
                user.cached_groups = []
                current_app.logger.warning(f"User {username} logged in via LDAP but has no groups")
    else:
        user.cached_groups = []
        if ldap_success:
            from flask import current_app
            current_app.logger.warning(f"User {username} logged in via LDAP but has no DN or groups")
    
    user.last_login = datetime.utcnow()
    
    # Commit user changes (including cached_groups) before role lookup
    # This ensures groups are in DB when we query for role mappings
    db.session.commit()
    current_app.logger.debug(f"Committed user {user.uid} with {len(user.cached_groups or [])} cached groups")
    
    # Create session
    session['user_id'] = user.id
    session['username'] = user.uid
    session.permanent = True
    
    # Get user roles (after commit to ensure groups are in DB)
    # Refresh user from DB to ensure we have the latest cached_groups
    db.session.refresh(user)
    roles = get_user_roles(user.id)
    
    # Log for debugging
    from flask import current_app
    current_app.logger.info(
        f"User {user.uid} login successful: "
        f"cached_groups={user.cached_groups}, "
        f"roles={roles}, "
        f"is_local_admin={user.is_local_admin}"
    )
    if user.is_local_admin:
        roles.append('admin')
    
    log_audit_event(user.id, ip_address, 'login_success', {
        'username': username,
        'roles': roles
    })
    
    return jsonify({
        'ok': True,
        'user': {
            'id': user.id,
            'uid': user.uid,
            'display_name': user.display_name,
            'email': user.email,
            'is_local_admin': user.is_local_admin
        },
        'roles': roles
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint."""
    user_id = session.get('user_id')
    ip_address = request.remote_addr
    
    if user_id:
        log_audit_event(user_id, ip_address, 'logout', {})
    
    session.clear()
    return jsonify({'ok': True}), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    """Get current user info."""
    from flask import current_app
    
    user_id = session.get('user_id')
    if not user_id:
        current_app.logger.debug("GET /api/auth/me: No user_id in session")
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        current_app.logger.warning(f"GET /api/auth/me: User {user_id} not found or disabled")
        session.clear()
        return jsonify({'error': 'User not found or disabled'}), 401
    
    roles = get_user_roles(user.id)
    if user.is_local_admin:
        roles.append('admin')
    
    current_app.logger.debug(
        f"GET /api/auth/me: User {user.uid} - roles: {roles}, "
        f"groups: {len(user.cached_groups or [])}"
    )
    
    return jsonify({
        'user': {
            'id': user.id,
            'uid': user.uid,
            'display_name': user.display_name,
            'email': user.email,
            'is_local_admin': user.is_local_admin,
            'last_login': user.last_login.isoformat() if user.last_login else None
        },
        'roles': roles,
        'groups': user.cached_groups or []
    }), 200


@auth_bp.route('/setup/check', methods=['GET'])
def check_setup():
    """Check if initial admin setup is needed."""
    admin_count = User.query.filter_by(is_local_admin=True).count()
    return jsonify({
        'setup_required': admin_count == 0
    }), 200


@auth_bp.route('/setup', methods=['POST'])
def setup_admin():
    # Note: CSRF exemption is handled in app factory via csrf.exempt()
    """Create initial admin user (only works if no admin exists)."""
    # Check if admin already exists
    admin_count = User.query.filter_by(is_local_admin=True).count()
    if admin_count > 0:
        return jsonify({'error': 'Admin user already exists. Setup is only available on first launch.'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    display_name = data.get('display_name', '').strip() or username
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long'}), 400
    
    # Check if username already exists
    existing = User.query.filter_by(uid=username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 409
    
    ip_address = request.remote_addr
    
    try:
        from ..utils.security import hash_password
        hashed_pw = hash_password(password)
        
        admin_user = User(
            uid=username,
            display_name=display_name,
            email=email,
            is_local_admin=True,
            password_hash=hashed_pw,
            disabled=False,
            cached_groups=[]
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        log_audit_event(None, ip_address, 'admin_setup', {
            'username': username,
            'display_name': display_name
        })
        
        # Auto-login the newly created admin
        session['user_id'] = admin_user.id
        session['username'] = admin_user.uid
        session.permanent = True
        
        return jsonify({
            'ok': True,
            'message': 'Admin user created successfully',
            'user': {
                'id': admin_user.id,
                'uid': admin_user.uid,
                'display_name': admin_user.display_name,
                'email': admin_user.email,
                'is_local_admin': True
            },
            'roles': ['admin']
        }), 201
        
    except Exception as e:
        db.session.rollback()
        from flask import current_app
        current_app.logger.error(f"Failed to create admin user: {str(e)}")
        return jsonify({'error': 'Failed to create admin user'}), 500


def log_audit_event(user_id, ip_address, action, details):
    """Log an audit event."""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            ip=ip_address,
            action=action,
            details=details
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        # Don't fail on audit log errors
        from flask import current_app
        current_app.logger.error(f"Failed to log audit event: {str(e)}")

