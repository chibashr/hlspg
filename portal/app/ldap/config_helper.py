"""Helper to get LDAP configuration from DB or env vars."""
from flask import current_app
from ..models import LDAPConfig


def get_ldap_config():
    """
    Get LDAP configuration, checking database first, then environment variables.
    
    Returns:
        dict: Configuration values
    """
    db_config = LDAPConfig.query.filter_by(id=1, enabled=True).first()
    
    if db_config and db_config.ldap_url:
        return {
            'ldap_url': db_config.ldap_url,
            'ldap_use_tls': db_config.ldap_use_tls,
            'ldap_bind_dn': db_config.ldap_bind_dn,
            'ldap_bind_password': db_config.ldap_bind_password,
            'ldap_base_dn': db_config.ldap_base_dn,
            'ldap_user_dn': db_config.ldap_user_dn,
            'ldap_group_dn': db_config.ldap_group_dn,
            'ldap_user_filter': db_config.ldap_user_filter or '(|(uid={username})(sAMAccountName={username})(mail={username}))',
            'ldap_group_filter': db_config.ldap_group_filter or '(objectClass=group)',
            'ldap_group_attribute': db_config.ldap_group_attribute or 'memberOf',
            'ldap_ca_cert': db_config.ldap_ca_cert_path,
            'ldap_search_timeout': db_config.ldap_search_timeout or 5,
        }
    else:
        config = current_app.config
        return {
            'ldap_url': config.get('LDAP_URL', ''),
            'ldap_use_tls': config.get('LDAP_USE_TLS', True),
            'ldap_bind_dn': config.get('LDAP_BIND_DN', ''),
            'ldap_bind_password': config.get('LDAP_BIND_PASSWORD', ''),
            'ldap_base_dn': config.get('LDAP_BASE_DN', ''),
            'ldap_user_dn': config.get('LDAP_USER_DN', ''),
            'ldap_group_dn': config.get('LDAP_GROUP_DN', ''),
            'ldap_user_filter': config.get('LDAP_USER_FILTER', '(|(uid={username})(sAMAccountName={username})(mail={username}))'),
            'ldap_group_filter': config.get('LDAP_GROUP_FILTER', '(objectClass=group)'),
            'ldap_group_attribute': config.get('LDAP_GROUP_ATTRIBUTE', 'memberOf'),
            'ldap_ca_cert': config.get('LDAP_CA_CERT', ''),
            'ldap_search_timeout': config.get('LDAP_SEARCH_TIMEOUT', 5),
        }

