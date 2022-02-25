import { execFile } from 'child_process';
import * as keytar from 'keytar';
// import * as path from 'path';

const SERVICE_NAME = 'vscode-teletype';

export class CredentialCache {
  private strategy: any;

  async get(key: string) {
    const strategy = await this.getStrategy();
    return strategy.get(SERVICE_NAME, key);
  }

  async set(key: string, value: string) {
    const strategy = await this.getStrategy();
    return strategy.set(SERVICE_NAME, key, value);
  }

  async delete(key: string) {
    const strategy = await this.getStrategy();
    return strategy.delete(SERVICE_NAME, key);
  }

  async getStrategy() {
    if (!this.strategy) {
      if (await KeytarStrategy.isValid()) {
        this.strategy = new KeytarStrategy();
      } else if (SecurityBinaryStrategy.isValid()) {
        this.strategy = new SecurityBinaryStrategy();
      } else {
        console.warn('Falling back to storing credentials in memory. Auth tokens will only be stored for the lifetime of the current window.');
        this.strategy = new InMemoryStrategy();
      }
    }

    return this.strategy;
  }
}

// let keytar: string;
// function getKeytar() {
//   if (!keytar) {
//     const bundledKeytarPath = path.join(atom.getLoadSettings().resourcePath, 'node_modules', 'keytar');
//     keytar = require(bundledKeytarPath);
//   }

//   return keytar;
// }

class KeytarStrategy {
  static async isValid() {
    try {
      await keytar.setPassword('atom-test-service', 'test-key', 'test-value');
      const value = await keytar.getPassword('atom-test-service', 'test-key');
      keytar.deletePassword('atom-test-service', 'test-key');
      return value === 'test-value';
    } catch (err) {
      return false;
    }
  }

  get(service: string, key: string): Promise<string | null> {
    return keytar.getPassword(service, key);
  }

  set(service: string, key: string, value: string) {
    return keytar.setPassword(service, key, value);
  }

  delete(service: string, key: string) {
    return keytar.deletePassword(service, key);
  }
}

class SecurityBinaryStrategy {
  static isValid() {
    return process.platform === 'darwin';
  }

  async get(service: string, key: string) {
    try {
      const value = await this.execSecurityBinary(['find-generic-password', '-s', service, '-a', key, '-w']);
      return value?.trim();
    } catch (error) {
      return null;
    }
  }

  set(service: string, key: string, value: string) {
    return this.execSecurityBinary(['add-generic-password', '-s', service, '-a', key, '-w', value, '-U']);
  }

  delete(service: string, key: string) {
    return this.execSecurityBinary(['delete-generic-password', '-s', service, '-a', key]);
  }

  execSecurityBinary(args: ReadonlyArray<string> | undefined | null): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('security', args, (error, stdout) => {
        if (error) { return reject(error); }
        return resolve(stdout);
      });
    });
  }
}

class InMemoryStrategy {
  credentials: Map<any, any>;
  constructor() {
    this.credentials = new Map();
  }

  get(service: string, key: string): Promise<string | null> {
    const valuesByKey = this.credentials.get(service);
    if (valuesByKey) {
      return Promise.resolve(valuesByKey.get(key));
    } else {
      return Promise.resolve(null);
    }
  }

  set(service: string, key: string, value: string) {
    let valuesByKey = this.credentials.get(service);
    if (!valuesByKey) {
      valuesByKey = new Map();
      this.credentials.set(service, valuesByKey);
    }

    valuesByKey.set(key, value);
    return Promise.resolve();
  }

  delete(service: string, key: string) {
    const valuesByKey = this.credentials.get(service);
    if (valuesByKey) { valuesByKey.delete(key); }
    return Promise.resolve();
  }
}

Object.assign(CredentialCache, { KeytarStrategy, SecurityBinaryStrategy, InMemoryStrategy });
module.exports = CredentialCache;
