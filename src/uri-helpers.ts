export function getPortalURI (portalId: string) : string {
    return `atom://teletype/portal/${portalId}`;
}

export function getEditorURI (portalId: string, editorProxyId: string) : string {
    return `${getPortalURI(portalId)}/editor/${editorProxyId}`;
}
