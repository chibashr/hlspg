/**
 * Utility functions for parsing LDAP data.
 */

/**
 * Extracts the CN (Common Name) from an LDAP DN (Distinguished Name).
 * Handles various DN formats and respects text boundaries.
 * 
 * @param {string} dn - The LDAP Distinguished Name (e.g., "CN=GroupName,OU=Groups,DC=example,DC=com")
 * @param {number} maxLength - Maximum length for the returned CN (default: 50)
 * @returns {string} - The extracted CN value, or a truncated version if too long
 */
export function extractCNFromDN(dn, maxLength = 50) {
  if (!dn || typeof dn !== 'string') {
    return dn || '';
  }

  // Remove leading/trailing whitespace
  const trimmedDN = dn.trim();
  
  // Find the first CN= or cn= (case-insensitive)
  const cnMatch = trimmedDN.match(/^cn=([^,]+)/i);
  
  if (cnMatch && cnMatch[1]) {
    let cn = cnMatch[1].trim();
    
    // Handle escaped characters in DN (e.g., \2C for comma, \20 for space)
    // Basic unescaping - replace common escape sequences
    cn = cn.replace(/\\([0-9A-Fa-f]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    // Remove quotes if present
    cn = cn.replace(/^["']|["']$/g, '');
    
    // Truncate if too long and add ellipsis
    if (cn.length > maxLength) {
      return cn.substring(0, maxLength - 3) + '...';
    }
    
    return cn;
  }
  
  // If no CN found, try to get the first RDN (Relative Distinguished Name)
  // This handles cases where the DN might start with a different attribute
  const firstRDN = trimmedDN.split(',')[0];
  if (firstRDN) {
    const parts = firstRDN.split('=');
    if (parts.length >= 2) {
      let value = parts.slice(1).join('=').trim();
      
      // Handle escaped characters
      value = value.replace(/\\([0-9A-Fa-f]{2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      
      // Truncate if too long
      if (value.length > maxLength) {
        return value.substring(0, maxLength - 3) + '...';
      }
      
      return value;
    }
  }
  
  // Fallback: return the original DN truncated if nothing else works
  if (trimmedDN.length > maxLength) {
    return trimmedDN.substring(0, maxLength - 3) + '...';
  }
  
  return trimmedDN;
}

