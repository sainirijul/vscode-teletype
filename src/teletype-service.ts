import TeletypePackage from "./teletype-package";

export default class TeletypeService {
    teletypePackage: TeletypePackage;

    constructor(teletypePackage: TeletypePackage) {
        this.teletypePackage = teletypePackage;
    }

    async getRemoteEditorsAsync() {
        const portalBindingManager = await this.teletypePackage.getPortalBindingManagerAsync();
        if (portalBindingManager) {
            return portalBindingManager.getRemoteEditors();
        } else {
            return [];
        }
    }
}
