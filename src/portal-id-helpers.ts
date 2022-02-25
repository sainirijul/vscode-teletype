const CONTAINS_UUID_REGEXP = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

export function findPortalId(portalUri: string) : string | null {
  if (!portalUri) { return null; }

  const match = portalUri.match(CONTAINS_UUID_REGEXP);
  return match ? match[0] : null;
}
