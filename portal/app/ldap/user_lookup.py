"""User lookup and authentication via LDAP."""
from flask import current_app
from .connector import get_ldap_connection, LDAPConnectionError
from .config_helper import get_ldap_config


def search_user(username):
    """
    Search for a user in LDAP using the configured filter.
    
    Args:
        username: Username to search for
    
    Returns:
        dict: User attributes including 'dn', 'cn', 'mail', 'memberOf', etc.
    
    Raises:
        LDAPConnectionError: If LDAP connection fails
        ValueError: If user not found
    """
    ldap_config = get_ldap_config()
    
    bind_dn = ldap_config.get('ldap_bind_dn')
    bind_pw = ldap_config.get('ldap_bind_password')
    # Use user_dn if specified, otherwise fall back to base_dn
    user_dn = ldap_config.get('ldap_user_dn') or ldap_config.get('ldap_base_dn')
    base_dn = ldap_config.get('ldap_base_dn')
    user_filter = ldap_config.get('ldap_user_filter')
    search_timeout = ldap_config.get('ldap_search_timeout', 5)
    
    if not user_dn:
        raise LDAPConnectionError("LDAP_USER_DN or LDAP_BASE_DN must be configured")
    
    # Use default filter if not configured
    if not user_filter:
        user_filter = '(|(uid={username})(sAMAccountName={username})(mail={username}))'
    
    # Format user filter
    search_filter = user_filter.format(username=username)
    
    try:
        # Connect and bind as service account
        conn = get_ldap_connection(bind_dn=bind_dn, bind_pw=bind_pw)
        
        # Search for user in the user DN
        # Explicitly request memberOf attribute (or configured group attribute)
        group_attr = ldap_config.get('ldap_group_attribute', 'memberOf')
        requested_attrs = ['*', group_attr]  # Request all + explicitly request group attribute
        
        conn.search(
            search_base=user_dn,
            search_filter=search_filter,
            attributes=requested_attrs,
            size_limit=1,
            time_limit=search_timeout
        )
        
        if not conn.entries:
            conn.unbind()
            raise ValueError(f"User '{username}' not found in LDAP")
        
        entry = conn.entries[0]
        user_data = {
            'dn': str(entry.entry_dn),
            'uid': username,
        }
        
        # Extract common attributes
        if 'cn' in entry:
            user_data['cn'] = str(entry.cn)
        if 'mail' in entry:
            user_data['mail'] = str(entry.mail)
        if 'displayName' in entry:
            user_data['displayName'] = str(entry.displayName)
        elif 'cn' in entry:
            user_data['displayName'] = str(entry.cn)
        
        # Extract groups - handle different formats
        # ldap3 can return multi-valued attributes in various formats
        if group_attr in entry:
            groups = entry[group_attr]
            user_data['memberOf'] = []
            
            # Handle different return types from ldap3
            # ldap3 can return multi-valued attributes as lists, tuples, or Attribute objects
            try:
                # Try to get all values - ldap3 Attribute objects have a 'values' property
                if hasattr(groups, 'values'):
                    # This is an ldap3 Attribute object - get all values
                    group_values = groups.values
                elif isinstance(groups, (list, tuple)):
                    # Already a list/tuple
                    group_values = groups
                elif hasattr(groups, '__iter__') and not isinstance(groups, (str, bytes)):
                    # Other iterable types (but not strings/bytes)
                    group_values = list(groups)
                else:
                    # Single value
                    group_values = [groups] if groups else []
                
                # Convert all items to strings, handling Entry objects
                for g in group_values:
                    if g is not None and g != '':  # Skip None/empty values
                        if hasattr(g, 'entry_dn'):
                            user_data['memberOf'].append(str(g.entry_dn))
                        else:
                            user_data['memberOf'].append(str(g))
                
                # Log how many groups were found
                if user_data['memberOf']:
                    current_app.logger.debug(
                        f"User {username}: Found {len(user_data['memberOf'])} groups from {group_attr} attribute"
                    )
            except Exception as e:
                # Fallback: try to convert to string if all else fails
                current_app.logger.warning(
                    f"Error extracting groups for user {username} from {group_attr}: {str(e)}. "
                    f"Type: {type(groups)}, Value: {groups}"
                )
                if groups:
                    try:
                        user_data['memberOf'] = [str(groups)]
                    except Exception:
                        user_data['memberOf'] = []
        else:
            user_data['memberOf'] = []
            # Log if group attribute is missing
            current_app.logger.warning(
                f"User {username} found but {group_attr} attribute not present. "
                f"Available attributes: {list(entry.keys())}"
            )
        
        conn.unbind()
        return user_data
        
    except LDAPConnectionError:
        raise
    except Exception as e:
        raise LDAPConnectionError(f"User search failed: {str(e)}")


def authenticate_user(username, password):
    """
    Authenticate a user by binding with their credentials.
    
    Args:
        username: Username
        password: Password
    
    Returns:
        dict: User attributes if authentication succeeds
    
    Raises:
        LDAPConnectionError: If LDAP connection fails
        ValueError: If authentication fails
    """
    # First, find the user DN
    try:
        user_data = search_user(username)
    except ValueError:
        raise ValueError("Invalid username or password")
    
    user_dn = user_data['dn']
    
    # Attempt to bind as the user
    try:
        conn = get_ldap_connection(bind_dn=user_dn, bind_pw=password)
        # If bind succeeds, connection is authenticated
        conn.unbind()
        return user_data
    except LDAPConnectionError:
        raise ValueError("Invalid username or password")


def get_user_groups(username):
    """
    Get LDAP groups for a user.
    Uses both forward lookup (memberOf attribute) and reverse lookup
    (searching groups for user membership) to ensure all groups are found.
    
    Args:
        username: Username
    
    Returns:
        list: List of group DNs
    """
    all_groups = set()
    
    try:
        # First, get user data including memberOf attribute
        user_data = search_user(username)
        user_dn = user_data.get('dn')
        
        if not user_dn:
            current_app.logger.warning(f"User {username} has no DN, cannot lookup groups")
            return []
        
        # Get groups from memberOf attribute (forward lookup)
        member_of_groups = user_data.get('memberOf', [])
        if member_of_groups:
            # Normalize and add groups from memberOf
            for group in member_of_groups:
                normalized = str(group).strip()
                if normalized:
                    all_groups.add(normalized)
            current_app.logger.debug(f"User {username}: Found {len(member_of_groups)} groups from memberOf attribute")
        
        # Also do reverse lookup: search for groups where user is a member
        # This catches cases where memberOf is not populated or incomplete
        ldap_config = get_ldap_config()
        bind_dn = ldap_config.get('ldap_bind_dn')
        bind_pw = ldap_config.get('ldap_bind_password')
        group_dn = ldap_config.get('ldap_group_dn') or ldap_config.get('ldap_base_dn')
        group_filter = ldap_config.get('ldap_group_filter')
        search_timeout = ldap_config.get('ldap_search_timeout', 5)
        
        if group_dn:
            # Use default group filter if not configured
            if not group_filter:
                group_filter = '(objectClass=group)'
            
            try:
                conn = get_ldap_connection(bind_dn=bind_dn, bind_pw=bind_pw)
                
                # Search for groups where user DN is in member, uniqueMember, or memberUid attributes
                # Try multiple common membership attributes
                membership_attrs = ['member', 'uniqueMember', 'memberUid']
                
                for attr in membership_attrs:
                    # Build filter: group filter AND (attr=user_dn OR attr=username)
                    reverse_filter = f'(&{group_filter}(|({attr}={user_dn})({attr}={username})))'
                    
                    try:
                        conn.search(
                            search_base=group_dn,
                            search_filter=reverse_filter,
                            attributes=['dn', 'cn'],
                            size_limit=0,  # No limit
                            time_limit=search_timeout
                        )
                        
                        for entry in conn.entries:
                            group_dn_str = str(entry.entry_dn)
                            normalized = group_dn_str.strip()
                            if normalized:
                                all_groups.add(normalized)
                        
                        if conn.entries:
                            current_app.logger.debug(
                                f"User {username}: Found {len(conn.entries)} groups via reverse lookup "
                                f"using {attr} attribute"
                            )
                    except Exception as e:
                        current_app.logger.debug(
                            f"Reverse lookup with {attr} attribute failed for user {username}: {str(e)}"
                        )
                        continue
                
                conn.unbind()
            except LDAPConnectionError as e:
                current_app.logger.warning(f"Failed to do reverse group lookup for user {username}: {str(e)}")
            except Exception as e:
                current_app.logger.warning(f"Unexpected error during reverse group lookup for user {username}: {str(e)}")
        else:
            current_app.logger.debug(f"No group_dn configured, skipping reverse lookup for user {username}")
        
        # Convert set to list and return
        result = list(all_groups)
        current_app.logger.info(
            f"User {username}: Total groups found: {len(result)} "
            f"(memberOf: {len(member_of_groups)}, reverse lookup: {len(result) - len(member_of_groups)})"
        )
        return result
        
    except (LDAPConnectionError, ValueError) as e:
        current_app.logger.error(f"Failed to get groups for user {username}: {str(e)}")
        return []

