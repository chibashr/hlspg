"""Bootstrap and initialization utilities."""
from datetime import datetime
from sqlalchemy import inspect
from sqlalchemy.exc import ProgrammingError, OperationalError
from .security import hash_password
from ..models import Role, User


def ensure_tables_exist(db, migrate):
    """
    Ensure all database tables exist by running migrations or creating them.
    """
    from flask import current_app
    
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # Check if core tables exist
        core_tables = ['roles', 'users', 'sites']
        missing_tables = [t for t in core_tables if t not in tables]
        
        if missing_tables:
            current_app.logger.info(f"Bootstrapping: Missing tables detected: {missing_tables}")
            current_app.logger.info("Bootstrapping: Attempting to create tables via migrations...")
            
            try:
                # Try to run migrations using Alembic via Flask-Migrate CLI
                from flask_migrate import upgrade as migrate_upgrade
                migrate_upgrade()
                current_app.logger.info("Bootstrapping: Migrations completed successfully")
            except Exception as e:
                current_app.logger.warning(f"Bootstrapping: Migration upgrade failed: {e}")
                current_app.logger.info("Bootstrapping: Falling back to create_all()...")
                
                try:
                    # Fallback: use SQLAlchemy's create_all
                    # This will create all tables defined in models
                    db.create_all()
                    current_app.logger.info("Bootstrapping: Tables created using create_all()")
                except Exception as e2:
                    current_app.logger.error(f"Bootstrapping: Failed to create tables: {e2}")
                    raise
        else:
            current_app.logger.debug("Bootstrapping: All core tables exist")
            
    except (ProgrammingError, OperationalError) as e:
        current_app.logger.error(f"Bootstrapping: Database connection error: {e}")
        raise
    except Exception as e:
        current_app.logger.error(f"Bootstrapping: Unexpected error checking/creating tables: {e}")
        raise


def bootstrap_app(db, migrate=None):
    """
    Bootstrap the application on first run.
    Creates default roles and initial admin user.
    """
    from flask import current_app
    
    # Ensure tables exist first
    if migrate:
        try:
            ensure_tables_exist(db, migrate)
        except Exception as e:
            current_app.logger.error(f"Bootstrapping: Could not ensure tables exist: {e}")
            return
    
    # Check if tables exist first
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # If tables don't exist, skip bootstrap (migrations need to run first)
        if 'roles' not in tables:
            current_app.logger.info("Bootstrapping: Database tables not found, skipping bootstrap")
            return
    except (ProgrammingError, OperationalError) as e:
        current_app.logger.warning(f"Bootstrapping: Could not check tables: {e}, skipping bootstrap")
        return
    
    # Check if roles exist
    try:
        role_count = Role.query.count()
    except (ProgrammingError, OperationalError) as e:
        current_app.logger.warning(f"Bootstrapping: Could not query roles: {e}, skipping bootstrap")
        return
    
    if role_count == 0:
        current_app.logger.info("Bootstrapping: Creating default roles")
        
        # Create default roles
        admin_role = Role(name='admin', description='Administrator with full access')
        user_role = Role(name='user', description='Standard user')
        
        db.session.add(admin_role)
        db.session.add(user_role)
        db.session.commit()
        
        current_app.logger.info("Bootstrapping: Created default roles")
    
    # Check if initial admin exists
    config = current_app.config
    admin_username = config.get('INITIAL_LOCAL_ADMIN_USERNAME', 'portal-admin')
    admin_password = config.get('INITIAL_LOCAL_ADMIN_PASSWORD', '')
    
    # Only auto-create admin if password is provided via env var
    # Otherwise, user must use the setup endpoint
    if admin_password:
        try:
            existing_admin = User.query.filter_by(uid=admin_username, is_local_admin=True).first()
            
            if not existing_admin:
                current_app.logger.info(f"Bootstrapping: Creating initial admin user '{admin_username}'")
                
                hashed_pw = hash_password(admin_password)
                admin_user = User(
                    uid=admin_username,
                    display_name='Initial Administrator',
                    email=config.get('MAINTAINER_EMAIL', ''),
                    is_local_admin=True,
                    password_hash=hashed_pw,
                    disabled=False,
                    cached_groups=[]
                )
                
                db.session.add(admin_user)
                db.session.commit()
                
                current_app.logger.info("Bootstrapping: Created initial admin user")
            else:
                current_app.logger.debug("Bootstrapping: Initial admin user already exists")
        except (ProgrammingError, OperationalError) as e:
            current_app.logger.warning(f"Bootstrapping: Could not check/create admin user: {e}")

