export function getPortalURI(portalId: string): string {
    return `atom://teletype/portal/${portalId}`;
}

export function isPortalURI(portalURI: string): boolean {
    return portalURI?.startsWith('atom://teletype/portal/');
}

export function getEditorURI(portalId: string, editorProxyId: string): string {
    return `${getPortalURI(portalId)}/editor/${editorProxyId}`;
}
