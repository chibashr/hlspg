"""Test RBAC functionality."""
import pytest
from app.db import db
from app.models import User, Role, LDAPGroup, RoleMapping
from app.utils.rbac import get_user_roles, has_role


def test_get_user_roles(app):
    """Test getting user roles."""
    with app.app_context():
        # Create user
        user = User(uid='testuser', cached_groups=['cn=admins,ou=groups,dc=test'])
        db.session.add(user)
        
        # Create role and group
        role = Role(name='admin')
        group = LDAPGroup(dn='cn=admins,ou=groups,dc=test', cn='admins')
        db.session.add_all([role, group])
        db.session.commit()
        
        # Create mapping
        mapping = RoleMapping(ldap_group_id=group.id, role_id=role.id)
        db.session.add(mapping)
        db.session.commit()
        
        # Test role retrieval
        roles = get_user_roles(user.id)
        assert 'admin' in roles


def test_has_role(app):
    """Test has_role function."""
    with app.app_context():
        user = User(uid='testuser', cached_groups=['cn=admins,ou=groups,dc=test'])
        db.session.add(user)
        
        role = Role(name='admin')
        group = LDAPGroup(dn='cn=admins,ou=groups,dc=test', cn='admins')
        db.session.add_all([role, group])
        db.session.commit()
        
        mapping = RoleMapping(ldap_group_id=group.id, role_id=role.id)
        db.session.add(mapping)
        db.session.commit()
        
        assert has_role(user.id, 'admin') is True
        assert has_role(user.id, 'user') is False

