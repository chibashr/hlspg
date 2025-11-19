"""Admin API blueprint."""
from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

from . import ldap_test, ldap_config, role_mappings, sites, users, audit, webapp_config, sso_config, ldap_groups

