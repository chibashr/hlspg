"""LDAP group synchronization to database."""
from flask import current_app
from ..db import db
from ..models import LDAPGroup
from datetime import datetime


def sync_group_to_db(group_dn, cn=None, description=None):
    """
    Sync an LDAP group to the database.
    Creates or updates the group record.
    
    Args:
        group_dn: Distinguished name of the group
        cn: Common name (optional)
        description: Description (optional)
    
    Returns:
        LDAPGroup: The group record
    """
    # Normalize DN: strip whitespace
    normalized_dn = str(group_dn).strip()
    
    if not normalized_dn:
        current_app.logger.warning("sync_group_to_db: Empty group DN provided")
        raise ValueError("Group DN cannot be empty")
    
    group = LDAPGroup.query.filter_by(dn=normalized_dn).first()
    
    if not group:
        group = LDAPGroup(dn=normalized_dn, cn=cn, description=description)
        db.session.add(group)
        current_app.logger.debug(f"Created new LDAP group in DB: {normalized_dn}")
    else:
        # Update existing group
        if cn:
            group.cn = cn
        if description:
            group.description = description
        group.last_seen = datetime.utcnow()
        current_app.logger.debug(f"Updated existing LDAP group in DB: {normalized_dn}")
    
    db.session.commit()
    return group

