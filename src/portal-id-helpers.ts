const CONTAINS_UUID_REGEXP = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

export function findPortalId(portalStr: string) : number | null {
  if (!portalStr) { return null; }

  const match = portalStr.match(CONTAINS_UUID_REGEXP);
  return match ? Number(match[0]) : null;
}
