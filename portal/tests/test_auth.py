"""Test authentication."""
import pytest
from app.db import db
from app.models import User
from app.auth.routes import login, logout, me


def test_login_missing_credentials(client):
    """Test login with missing credentials."""
    response = client.post('/api/auth/login', json={})
    assert response.status_code == 400


def test_login_invalid_credentials(client, mock_ldap):
    """Test login with invalid credentials."""
    # Mock LDAP to raise ValueError (invalid credentials)
    import app.ldap.user_lookup
    original_authenticate = app.ldap.user_lookup.authenticate_user
    
    def mock_authenticate(username, password):
        raise ValueError("Invalid username or password")
    
    app.ldap.user_lookup.authenticate_user = mock_authenticate
    
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'wrongpass'
    })
    
    assert response.status_code == 401
    app.ldap.user_lookup.authenticate_user = original_authenticate


def test_me_not_authenticated(client):
    """Test /me endpoint without authentication."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_logout(client):
    """Test logout."""
    response = client.post('/api/auth/logout')
    assert response.status_code == 200

