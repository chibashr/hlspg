"""pytest configuration and fixtures."""
import pytest
from app import create_app
from app.db import db
from app.config import Config
import tempfile
import os


class TestConfig(Config):
    """Test configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    WTF_CSRF_ENABLED = False
    LDAP_URL = 'ldaps://test-ldap:636'
    LDAP_USE_TLS = True
    LDAP_CA_CERT = '/tmp/test-ca.pem'
    LDAP_BIND_DN = 'cn=test,dc=test'
    LDAP_BIND_PASSWORD = 'test'
    LDAP_BASE_DN = 'dc=test'
    REDIS_URL = 'redis://localhost:6379/1'


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app(TestConfig)
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def mock_ldap(monkeypatch):
    """Mock LDAP connection."""
    class MockConnection:
        def __init__(self, *args, **kwargs):
            self.entries = []
            self.bound = False
        
        def open(self):
            pass
        
        def bind(self):
            self.bound = True
            return True
        
        def unbind(self):
            self.bound = False
        
        def search(self, *args, **kwargs):
            pass
    
    def mock_get_connection(*args, **kwargs):
        return MockConnection()
    
    monkeypatch.setattr('app.ldap.connector.get_ldap_connection', mock_get_connection)
    return MockConnection

