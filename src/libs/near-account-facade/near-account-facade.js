export class NearAccountFacade {
  // nearAPI: import * as nearAPI from "near-api-js"
  // connectionConfig: {
  //   networkId: "testnet",
  //   keyStore: myKeyStore,
  //   nodeUrl: "https://rpc.testnet.near.org",
  //   walletUrl: "https://wallet.testnet.near.org",
  //   helperUrl: "https://helper.testnet.near.org",
  //   explorerUrl: "https://explorer.testnet.near.org",
  // }
  // seedUtil: import seedUtil from 'near-seed-phrase';
  // walletApiOrigin: as example for testnet https://testnet-api.kitwallet.app
  static async instantiate(nearAPI, connectionConfig, seedUtil, httpClient, walletApiOrigin) {
    const nearAccountDocker = new NearAccountFacade(nearAPI, connectionConfig, seedUtil, httpClient, walletApiOrigin);
    await nearAccountDocker.connect();
    return nearAccountDocker;
  }

  #nearAPI = null;
  #nearKeyStore = null;
  #connectionConfig = null;
  #seedUtil = null;
  #httpClient = null;
  #walletApiOrigin = null;
  #nearConnection = null;

  constructor(nearAPI, connectionConfig, seedUtil, httpClient, walletApiOrigin) {
    this.#nearAPI = nearAPI;
    this.#nearKeyStore = new this.#nearAPI.keyStores.InMemoryKeyStore();
    this.#connectionConfig = {
      ...connectionConfig,
      keyStore: this.#nearKeyStore,
    };
    this.#seedUtil = seedUtil;
    this.#httpClient = httpClient;
    this.#walletApiOrigin = walletApiOrigin;
  }

  // #region : public methods
  async connect() {
    this.#nearConnection = await this.#nearAPI.connect(this.#connectionConfig);
  }

  toSecretKey(seedPhrase) {
    const {secretKey} = this.#seedUtil.parseSeedPhrase(seedPhrase);
    return secretKey;
  }

  toPublicKey(secretKey) {
    const keyPair = this.#nearAPI.KeyPair.fromString(secretKey);
    return keyPair.getPublicKey().toString();
  }

  async grantAccountAccess(accountId, secretKey) {
    await this.#nearKeyStore.setKey(this.#connectionConfig.networkId, accountId, this.#nearAPI.KeyPair.fromString(secretKey));
  }

  async getAccountId(publicKey) {
    const [accountId] = (await this.#httpClient.get(`${this.#walletApiOrigin}/publicKey/${publicKey}/accounts`)).data;
    return accountId;
  }

  async retrieveAccountAccessData(seed) {
    const {publicKey, secretKey} = this.#seedUtil.parseSeedPhrase(seed);
    const accountId = await this.getAccountId(publicKey);
    return {accountId, publicKey, secretKey};
  }

  genKeys(number = 1) {
    return (new Array(number)).fill(null).map(() => this.#seedUtil.generateSeedPhrase());
  }

  async addAccountKeys(accountId, keys) {
    const account = await this.#getAccountEntity(accountId);
    await Promise.all(keys.map((key) => account.addKey(key)));
  }

  async deleteAccountKeys(accountId, keys) {
    const account = await this.#getAccountEntity(accountId);
    await Promise.all(keys.map((key) => account.deleteKey(key)));
  }

  async getAccountKeys(accountId) {
    const account = await this.#getAccountEntity(accountId);
    return await account.getAccessKeys();
  }

  // exceptionKeys: list of account public keys
  async clearAccountKeys(accountId, exceptionKeys) {
    const account = await this.#getAccountEntity(accountId);
    const keys = await account.getAccessKeys();
    await Promise.all(
      keys
        .filter((key) => !exceptionKeys.includes(key['public_key']))
        .map((key) => account.deleteKey(key['public_key'])),
    );
  }

  async isAccountKeysAdded(accountId, prevKeys, diffNumber = 1, permission = 'FullAccess') {
    const account = await this.#nearConnection.account(accountId);
    const currentKeys = await account.getAccessKeys();
    const keyDiff = currentKeys.filter((currentKey) => {
      return currentKey['access_key'].permission === permission && !prevKeys.includes(currentKey['public_key']);
    });
    return keyDiff.length >= diffNumber;
  }
  // #endregion : public methods


  // #region : private methods
  async #getAccountEntity(accountId) {
    return await this.#nearConnection.account(accountId);
  }
  // #endregion : private methods
}
