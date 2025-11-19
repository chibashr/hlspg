"""Utility helpers for resolving site token placeholders."""
import re


TOKEN_PATTERN = re.compile(r"\$\{([^}]+)\}")


def _token_map(site):
    return {
        'NAME': site.name or '',
        'URL': site.url or '',
        'PROXY_URL': site.proxy_url or '',
        'SSH_PATH': site.ssh_path or '',
        'SIGN_ON_METHOD': site.sign_on_method or '',
        'CONSOLE_URL': site.console_url or '',
        'INLINE_WEB_URL': site.inline_web_url or '',
        'INLINE_SSH_URL': site.inline_ssh_url or '',
        'INLINE_VNC_URL': site.inline_vnc_url or '',
        'INLINE_PROXY_MODE': site.inline_proxy_mode or '',
        'INLINE_PROXY_AUTH': site.inline_proxy_auth or '',
    }


def resolve_site_tokens(value, site):
    """Replace ${TOKEN} placeholders with site attributes."""
    if not isinstance(value, str):
        return value

    token_values = _token_map(site)

    def replacer(match):
        key = match.group(1).strip().upper()
        return token_values.get(key, match.group(0))

    return TOKEN_PATTERN.sub(replacer, value)

