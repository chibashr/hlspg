"""LDAP connection management with TLS/CA verification."""
import ssl
from flask import current_app
from ldap3 import Server, Connection, Tls, ALL, core
from ldap3.core.exceptions import LDAPException


class LDAPConnectionError(Exception):
    """LDAP connection error."""
    pass


def get_ldap_connection(bind_dn=None, bind_pw=None, use_tls=None):
    """
    Create and return an LDAP connection with TLS/CA verification.
    
    Args:
        bind_dn: DN to bind as (optional)
        bind_pw: Password for bind (optional)
        use_tls: Override LDAP_USE_TLS config (optional)
    
    Returns:
        Connection: ldap3 Connection object
    
    Raises:
        LDAPConnectionError: If connection fails
    """
    from ..models import LDAPConfig
    
    # Check database config first (overrides env vars)
    db_config = LDAPConfig.query.filter_by(id=1, enabled=True).first()
    
    if db_config and db_config.ldap_url:
        # Use database config
        ldap_url = db_config.ldap_url
        use_tls = use_tls if use_tls is not None else db_config.ldap_use_tls
        ca_cert = db_config.ldap_ca_cert_path
        base_dn = db_config.ldap_base_dn
        user_filter = db_config.ldap_user_filter
        group_attribute = db_config.ldap_group_attribute
        search_timeout = db_config.ldap_search_timeout or 5
        
        # Use provided bind_dn/pw or fall back to config
        if not bind_dn:
            bind_dn = db_config.ldap_bind_dn
        if not bind_pw:
            bind_pw = db_config.ldap_bind_password
        
        # Log configuration source (without sensitive data)
        current_app.logger.debug(f"Using database LDAP config: URL={ldap_url}, Bind DN={'***' if bind_dn else 'None'}, Has Password={bool(bind_pw)}")
    else:
        # Fall back to environment variables
        config = current_app.config
        ldap_url = config.get('LDAP_URL')
        use_tls = use_tls if use_tls is not None else config.get('LDAP_USE_TLS', True)
        ca_cert = config.get('LDAP_CA_CERT')
        base_dn = config.get('LDAP_BASE_DN')
        user_filter = config.get('LDAP_USER_FILTER')
        group_attribute = config.get('LDAP_GROUP_ATTRIBUTE', 'memberOf')
        search_timeout = config.get('LDAP_SEARCH_TIMEOUT', 5)
        
        if not bind_dn:
            bind_dn = config.get('LDAP_BIND_DN')
        if not bind_pw:
            bind_pw = config.get('LDAP_BIND_PASSWORD')
        
        # Log configuration source (without sensitive data)
        current_app.logger.debug(f"Using environment LDAP config: URL={ldap_url}, Bind DN={'***' if bind_dn else 'None'}")
    
    if not ldap_url:
        raise LDAPConnectionError("LDAP_URL not configured")
    
    # Setup TLS with CA verification
    tls_config = None
    if use_tls:
        if not ca_cert:
            raise LDAPConnectionError("LDAP_CA_CERT required when LDAP_USE_TLS is true")
        
        try:
            tls_config = Tls(
                validate=ssl.CERT_REQUIRED,
                ca_certs_file=ca_cert,
                version=ssl.PROTOCOL_TLS_CLIENT
            )
        except Exception as e:
            raise LDAPConnectionError(f"Failed to configure TLS: {str(e)}")
    
    try:
        # Determine if URL uses ldaps:// or ldap://
        use_ssl = ldap_url.startswith('ldaps://')
        
        server = Server(
            ldap_url,
            use_ssl=use_ssl,
            get_info=ALL,
            tls=tls_config if tls_config else None
        )
        
        conn = Connection(
            server,
            user=bind_dn,
            password=bind_pw,
            auto_bind=False,
            raise_exceptions=True
        )
        
        conn.open()
        
        # If using ldap://, start TLS
        if not use_ssl and use_tls:
            conn.start_tls()
        
        # Bind if credentials provided
        if bind_dn and bind_pw:
            try:
                if not conn.bind():
                    error_msg = f"LDAP bind failed"
                    if hasattr(conn, 'result') and conn.result:
                        error_msg += f": {conn.result}"
                    if hasattr(conn, 'last_error'):
                        error_msg += f" (Error: {conn.last_error})"
                    raise LDAPConnectionError(error_msg)
            except Exception as bind_error:
                error_msg = f"LDAP bind failed: {str(bind_error)}"
                if hasattr(conn, 'result') and conn.result:
                    error_msg += f" (Result: {conn.result})"
                raise LDAPConnectionError(error_msg)
        
        return conn
        
    except LDAPException as e:
        raise LDAPConnectionError(f"LDAP connection failed: {str(e)}")
    except Exception as e:
        raise LDAPConnectionError(f"Unexpected error connecting to LDAP: {str(e)}")

