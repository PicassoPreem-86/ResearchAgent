/**
 * Validates and normalizes a domain string.
 * Strips protocol, www prefix, trailing slashes/paths.
 * Rejects domains with invalid characters or missing TLD.
 */
export function validateDomain(input: string): string {
  let domain = input.trim().toLowerCase()

  // Strip protocol
  domain = domain.replace(/^https?:\/\//, '')

  // Strip www. prefix
  domain = domain.replace(/^www\./, '')

  // Strip trailing slashes and paths
  domain = domain.replace(/\/.*$/, '')

  // Strip trailing dot
  domain = domain.replace(/\.$/, '')

  if (!domain) {
    throw new Error('Domain cannot be empty')
  }

  // Reject spaces
  if (/\s/.test(domain)) {
    throw new Error('Domain cannot contain spaces')
  }

  // Only allow alphanumeric, hyphens, and dots
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error('Domain contains invalid characters (only letters, numbers, hyphens, and dots are allowed)')
  }

  // Must have at least one dot (TLD required)
  if (!domain.includes('.')) {
    throw new Error('Domain must include a TLD (e.g. .com, .io)')
  }

  return domain
}
