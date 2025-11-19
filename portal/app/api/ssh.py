"""SSH WebSocket endpoint for terminal connections."""
import paramiko
import threading
import queue
import json
from flask import session
from flask_socketio import emit, disconnect
from ..db import db
from ..models import User, UserCredential, Site
import logging

logger = logging.getLogger(__name__)

# Store active SSH connections
active_connections = {}


def _require_user():
    """Helper to fetch authenticated user from session."""
    user_id = session.get('user_id')
    if not user_id:
        return None
    
    user = User.query.get(user_id)
    if not user or user.disabled:
        return None
    
    return user


def handle_ssh_connect(socketio, data, request_sid):
    """Handle SSH connection request."""
    user = _require_user()
    if not user:
        socketio.emit('error', {'message': 'Authentication required'}, room=request_sid)
        return
    
    site_id = data.get('site_id')
    host = data.get('host')
    port = int(data.get('port', 22))
    username = data.get('username')
    password = data.get('password')  # May be None if using saved credentials
    use_saved = data.get('use_saved', False)
    save_credentials = data.get('save_credentials', False)
    
    if not host or not username:
        socketio.emit('error', {'message': 'Host and username are required'}, room=request_sid)
        return
    
    # Try to get saved credentials if requested
    saved_password = None
    if use_saved and site_id:
        try:
            site = Site.query.get(site_id)
            if site:
                # Find password credential for this user and site
                credentials = UserCredential.query.filter_by(
                    user_id=user.id,
                    credential_type='password'
                ).all()
                for cred in credentials:
                    if site in cred.associated_sites or not cred.associated_sites:
                        # Decrypt password
                        from ..utils.security import decrypt_password
                        saved_password = decrypt_password(cred.data)
                        break
        except Exception as e:
            logger.warning(f"Failed to retrieve saved credentials: {str(e)}")
    
    # Use saved password if available, otherwise use provided password
    auth_password = saved_password if saved_password else password
    
    if not auth_password:
        socketio.emit('error', {'message': 'Password is required'}, room=request_sid)
        return
    
    # Create SSH connection
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect with timeout
        ssh.connect(
            hostname=host,
            port=port,
            username=username,
            password=auth_password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        
        # Create interactive shell
        channel = ssh.invoke_shell(term='xterm-256color')
        channel.settimeout(0.1)
        
        # Store connection
        connection_id = f"{user.id}_{site_id}_{host}_{port}"
        active_connections[connection_id] = {
            'ssh': ssh,
            'channel': channel,
            'user_id': user.id,
            'site_id': site_id
        }
        
        # Save credentials if requested
        if save_credentials and site_id and password:
            try:
                site = Site.query.get(site_id)
                if site:
                    from ..utils.security import encrypt_password
                    # Check if credential already exists
                    existing = UserCredential.query.filter_by(
                        user_id=user.id,
                        credential_type='password'
                    ).first()
                    
                    if existing:
                        # Update existing
                        existing.data = encrypt_password(password)
                        if site not in existing.associated_sites:
                            existing.associated_sites.append(site)
                    else:
                        # Create new
                        credential = UserCredential(
                            user_id=user.id,
                            credential_type='password',
                            name=f"SSH password for {site.name}",
                            data=encrypt_password(password)
                        )
                        credential.associated_sites.append(site)
                        db.session.add(credential)
                    
                    db.session.commit()
            except Exception as e:
                logger.warning(f"Failed to save credentials: {str(e)}")
        
        socketio.emit('connected', {'message': 'SSH connection established', 'connection_id': connection_id}, room=request_sid)
        
        # Start reading from channel in background thread
        def read_channel():
            try:
                import time
                while True:
                    if channel.recv_ready():
                        data = channel.recv(4096)
                        if data:
                            socketio.emit('output', {'data': data.decode('utf-8', errors='replace')}, room=request_sid)
                    elif channel.exit_status_ready():
                        break
                    time.sleep(0.1)
            except Exception as e:
                logger.error(f"Error reading from SSH channel: {str(e)}")
            finally:
                # Cleanup
                try:
                    channel.close()
                    ssh.close()
                except:
                    pass
                if connection_id in active_connections:
                    del active_connections[connection_id]
                socketio.emit('disconnected', {'message': 'SSH connection closed'}, room=request_sid)
        
        thread = threading.Thread(target=read_channel, daemon=True)
        thread.start()
        
        return connection_id
        
    except paramiko.AuthenticationException:
        socketio.emit('error', {'message': 'Authentication failed. Please check your credentials.'}, room=request_sid)
    except paramiko.SSHException as e:
        socketio.emit('error', {'message': f'SSH connection failed: {str(e)}'}, room=request_sid)
    except Exception as e:
        logger.error(f"SSH connection error: {str(e)}")
        socketio.emit('error', {'message': f'Connection failed: {str(e)}'}, room=request_sid)


def handle_ssh_input(socketio, connection_id, data, request_sid):
    """Handle input from terminal."""
    if connection_id not in active_connections:
        socketio.emit('error', {'message': 'Connection not found'}, room=request_sid)
        return
    
    try:
        conn = active_connections[connection_id]
        channel = conn['channel']
        
        # Send input to SSH channel
        input_data = data.get('input', '')
        if input_data:
            channel.send(input_data.encode('utf-8'))
    except Exception as e:
        logger.error(f"Error sending input to SSH: {str(e)}")
        socketio.emit('error', {'message': f'Failed to send input: {str(e)}'}, room=request_sid)


def handle_ssh_disconnect(connection_id):
    """Handle SSH disconnection."""
    if connection_id in active_connections:
        try:
            conn = active_connections[connection_id]
            conn['channel'].close()
            conn['ssh'].close()
        except:
            pass
        del active_connections[connection_id]

