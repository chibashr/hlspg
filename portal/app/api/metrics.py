"""Prometheus metrics endpoint."""
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

# Define metrics
logins_success = Counter('hlspg_logins_success_total', 'Total successful logins')
logins_fail = Counter('hlspg_logins_fail_total', 'Total failed logins')
ldap_connect_failures = Counter('hlspg_ldap_connect_failures_total', 'Total LDAP connection failures')
sites_served = Counter('hlspg_sites_served_total', 'Total sites served to users')


def get_metrics():
    """Get Prometheus metrics."""
    return generate_latest(), CONTENT_TYPE_LATEST

