"""Test database models."""
import pytest
from app.db import db
from app.models import Role, LDAPGroup, RoleMapping, Site, GroupSiteMap, User, AuditLog
from datetime import datetime


def test_role_creation(app):
    """Test creating a role."""
    with app.app_context():
        role = Role(name='admin', description='Administrator')
        db.session.add(role)
        db.session.commit()
        
        assert role.id is not None
        assert role.name == 'admin'
        assert Role.query.filter_by(name='admin').first() is not None


def test_ldap_group_creation(app):
    """Test creating an LDAP group."""
    with app.app_context():
        group = LDAPGroup(dn='cn=test,ou=groups,dc=test', cn='test')
        db.session.add(group)
        db.session.commit()
        
        assert group.id is not None
        assert group.dn == 'cn=test,ou=groups,dc=test'


def test_role_mapping(app):
    """Test role mapping."""
    with app.app_context():
        role = Role(name='admin')
        group = LDAPGroup(dn='cn=admins,ou=groups,dc=test', cn='admins')
        db.session.add_all([role, group])
        db.session.commit()
        
        mapping = RoleMapping(ldap_group_id=group.id, role_id=role.id)
        db.session.add(mapping)
        db.session.commit()
        
        assert mapping.id is not None
        assert mapping.ldap_group.dn == 'cn=admins,ou=groups,dc=test'
        assert mapping.role.name == 'admin'


def test_site_creation(app):
    """Test creating a site."""
    with app.app_context():
        site = Site(name='Test Site', url='https://test.example.com')
        db.session.add(site)
        db.session.commit()
        
        assert site.id is not None
        assert site.name == 'Test Site'


def test_group_site_mapping(app):
    """Test group to site mapping."""
    with app.app_context():
        group = LDAPGroup(dn='cn=users,ou=groups,dc=test', cn='users')
        site = Site(name='Test Site', url='https://test.example.com')
        db.session.add_all([group, site])
        db.session.commit()
        
        mapping = GroupSiteMap(ldap_group_id=group.id, site_id=site.id)
        db.session.add(mapping)
        db.session.commit()
        
        assert mapping.id is not None
        assert len(site.group_mappings) == 1


def test_user_creation(app):
    """Test creating a user."""
    with app.app_context():
        user = User(uid='testuser', display_name='Test User', cached_groups=['cn=users,ou=groups,dc=test'])
        db.session.add(user)
        db.session.commit()
        
        assert user.id is not None
        assert user.uid == 'testuser'
        assert len(user.cached_groups) == 1


def test_audit_log(app):
    """Test audit logging."""
    with app.app_context():
        user = User(uid='testuser')
        db.session.add(user)
        db.session.commit()
        
        log = AuditLog(user_id=user.id, ip='127.0.0.1', action='test_action', details={'test': True})
        db.session.add(log)
        db.session.commit()
        
        assert log.id is not None
        assert log.user_id == user.id
        assert log.action == 'test_action'

