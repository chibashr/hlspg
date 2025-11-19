"""SQLAlchemy models for HLSPG."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import db


class Role(db.Model):
    """Application roles."""
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    
    role_mappings = relationship('RoleMapping', back_populates='role', cascade='all, delete-orphan')


class LDAPGroup(db.Model):
    """Cached LDAP groups."""
    __tablename__ = 'ldap_groups'
    
    id = Column(Integer, primary_key=True)
    dn = Column(Text, unique=True, nullable=False)
    cn = Column(String(255))
    description = Column(String(1024))
    last_seen = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    role_mappings = relationship('RoleMapping', back_populates='ldap_group', cascade='all, delete-orphan')
    site_mappings = relationship('GroupSiteMap', back_populates='ldap_group', cascade='all, delete-orphan')


class RoleMapping(db.Model):
    """Mapping of LDAP groups to application roles."""
    __tablename__ = 'role_mappings'
    
    id = Column(Integer, primary_key=True)
    ldap_group_id = Column(Integer, ForeignKey('ldap_groups.id'), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    ldap_group = relationship('LDAPGroup', back_populates='role_mappings')
    role = relationship('Role', back_populates='role_mappings')
    
    __table_args__ = (UniqueConstraint('ldap_group_id', 'role_id', name='uq_role_mapping'),)


class Site(db.Model):
    """Internal sites and machines."""
    __tablename__ = 'sites'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False, unique=True)
    description = Column(String(1024))
    visible = Column(Boolean, default=True)
    health_url = Column(String(1024))
    owner = Column(String(255))
    ssh_path = Column(String(1024))  # SSH connection path (e.g., user@hostname or hostname)
    access_methods = Column(JSON)  # List of access methods (e.g., ["HTTPS", "SSH", "RDP"])
    proxy_url = Column(String(1024))  # Optional proxy endpoint URL
    sign_on_method = Column(String(255))  # Sign-on method description (e.g., "RADIUS", "LDAP", "OAuth")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    group_mappings = relationship('GroupSiteMap', back_populates='site', cascade='all, delete-orphan')


class GroupSiteMap(db.Model):
    """Many-to-many mapping of LDAP groups to sites."""
    __tablename__ = 'group_site_map'
    
    id = Column(Integer, primary_key=True)
    ldap_group_id = Column(Integer, ForeignKey('ldap_groups.id'), nullable=False)
    site_id = Column(Integer, ForeignKey('sites.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    ldap_group = relationship('LDAPGroup', back_populates='site_mappings')
    site = relationship('Site', back_populates='group_mappings')
    
    __table_args__ = (UniqueConstraint('ldap_group_id', 'site_id', name='uq_group_site'),)


class User(db.Model):
    """Portal user records (cached from LDAP)."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    uid = Column(String(255), unique=True, nullable=False)
    dn = Column(Text)
    display_name = Column(String(255))
    email = Column(String(255))
    last_login = Column(DateTime)
    cached_groups = Column(JSON)  # List of group DNs
    is_local_admin = Column(Boolean, default=False)
    password_hash = Column(String(255))  # Bcrypt hash for local admin passwords
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    audit_logs = relationship('AuditLog', back_populates='user')


class AuditLog(db.Model):
    """Security and audit events."""
    __tablename__ = 'audit_log'
    
    id = Column(Integer, primary_key=True)
    ts = Column(DateTime, server_default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    ip = Column(String(50))
    action = Column(String(255), nullable=False, index=True)
    details = Column(JSON)
    
    user = relationship('User', back_populates='audit_logs')


class LDAPConfig(db.Model):
    """LDAP configuration stored in database (overrides env vars)."""
    __tablename__ = 'ldap_config'
    
    id = Column(Integer, primary_key=True)
    ldap_url = Column(String(1024))
    ldap_use_tls = Column(Boolean, default=True)
    ldap_bind_dn = Column(String(1024))
    ldap_bind_password = Column(Text)  # Encrypted or plain (admin-only access)
    ldap_base_dn = Column(String(1024))
    ldap_user_dn = Column(String(1024))  # DN where users are located (e.g., ou=users,dc=example,dc=com)
    ldap_group_dn = Column(String(1024))  # DN where groups are located (e.g., ou=groups,dc=example,dc=com)
    ldap_user_filter = Column(String(1024))
    ldap_group_filter = Column(String(1024))  # Filter for searching groups (e.g., (objectClass=group))
    ldap_group_attribute = Column(String(255), default='memberOf')
    ldap_ca_cert_path = Column(String(1024))  # Path to uploaded CA cert
    ldap_search_timeout = Column(Integer, default=5)
    enabled = Column(Boolean, default=True)  # Whether to use DB config or env vars
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class WebAppConfig(db.Model):
    """Web application configuration (title, theme, branding)."""
    __tablename__ = 'webapp_config'
    
    id = Column(Integer, primary_key=True)
    app_title = Column(String(255), default='HLSPG Portal')
    page_title = Column(String(255), default='Home Lab Single Pane of Glass')
    domain = Column(String(255))
    primary_color = Column(String(7), default='#1976d2')  # Hex color
    secondary_color = Column(String(7), default='#dc004e')  # Hex color
    logo_url = Column(String(1024))  # URL to logo image
    favicon_url = Column(String(1024))  # URL to favicon
    footer_text = Column(String(512))
    login_title = Column(String(255))  # Custom title for login page
    login_subtitle = Column(String(512))  # Custom subtitle for login page
    login_description = Column(Text)  # Custom description for login page
    cors_enabled = Column(Boolean, default=False)  # Enable CORS (off by default)
    proxy_host_validation_enabled = Column(Boolean, default=False)  # Enable proxy host validation (off by default)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('id = 1', name='single_webapp_config'),
    )


class SSOConfig(db.Model):
    """SSO configuration (OIDC, etc.)."""
    __tablename__ = 'sso_config'
    
    id = Column(Integer, primary_key=True)
    provider = Column(String(50), default='oidc')  # oidc, saml
    enabled = Column(Boolean, default=False)
    issuer_url = Column(String(1024))  # OIDC Issuer URL (for discovery)
    authorization_endpoint = Column(String(1024))  # Optional: explicit auth endpoint
    token_endpoint = Column(String(1024))  # Optional: explicit token endpoint
    userinfo_endpoint = Column(String(1024))  # Optional: explicit userinfo endpoint
    client_id = Column(String(255))
    client_secret = Column(Text)  # Encrypted or plain (admin-only access)
    redirect_uri = Column(String(1024))
    scopes = Column(String(255), default='openid profile email')  # Space-separated
    # Legacy fields for backward compatibility
    sso_url = Column(String(1024))  # Deprecated: use issuer_url
    realm = Column(String(255))  # Deprecated: Keycloak-specific
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('id = 1', name='single_sso_config'),
    )

