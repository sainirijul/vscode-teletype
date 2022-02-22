import TeletypePackage from "./teletype-package";

export default class TeletypeService {
  teletypePackage: TeletypePackage;

  constructor (teletypePackage: TeletypePackage) {
    this.teletypePackage = teletypePackage;
  }

  async getRemoteEditors () {
    const portalBindingManager = await this.teletypePackage.getPortalBindingManager();
    if (portalBindingManager) {
      return portalBindingManager.getRemoteEditors();
    } else {
      return [];
    }
  }
}
