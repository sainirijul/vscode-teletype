const CONTAINS_UUID_REGEXP = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

export function findPortalId(string: string) : string | null {
  if (!string) { return null; }

  const match = string.match(CONTAINS_UUID_REGEXP);
  return match ? match[0] : null;
}
