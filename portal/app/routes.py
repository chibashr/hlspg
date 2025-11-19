"""Main routes for the portal."""
from flask import redirect, session
from .models import User
from .utils.rbac import get_user_roles


def register_routes(app):
    """Register main portal routes."""
    
    @app.route('/login')
    def login_page():
        """Login page - nginx serves React app, this is just for API compatibility."""
        # If already logged in, redirect based on role
        user_id = session.get('user_id')
        if user_id:
            user = User.query.get(user_id)
            if user and not user.disabled:
                roles = get_user_roles(user.id)
                if user.is_local_admin:
                    roles.append('admin')
                if 'admin' in roles:
                    return redirect('/dashboard', code=302)
                else:
                    return redirect('/portal', code=302)
        # Not logged in - nginx will serve React login page
        return redirect('/login', code=302)
    
    @app.route('/portal')
    def portal_page():
        """User portal page - nginx serves React app."""
        # Check authentication
        user_id = session.get('user_id')
        if not user_id:
            return redirect('/login', code=302)
        
        user = User.query.get(user_id)
        if not user or user.disabled:
            return redirect('/login', code=302)
        
        roles = get_user_roles(user.id)
        if user.is_local_admin:
            roles.append('admin')
        
        # If admin, allow access but they can navigate to admin area via menu
        # nginx will serve React app which handles routing
        return redirect('/portal', code=302)
    
    @app.route('/admin')
    def admin_page():
        """Admin portal page - nginx serves React app."""
        # Check authentication
        user_id = session.get('user_id')
        if not user_id:
            return redirect('/login', code=302)
        
        user = User.query.get(user_id)
        if not user or user.disabled:
            return redirect('/login', code=302)
        
        roles = get_user_roles(user.id)
        if user.is_local_admin:
            roles.append('admin')
        
        # Check if user is admin
        if 'admin' not in roles:
            return redirect('/portal', code=302)
        
        # nginx will serve React app which handles routing
        return redirect('/dashboard', code=302)

