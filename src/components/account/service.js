export class AccountService {
  #dataAccess;
  #nearAccountClient;
  #pageDataComposer;
  #eventEmitter;
  #events;

  constructor(dataAccess, nearAccountClient, pageDataComposer) {
    this.#dataAccess = dataAccess;
    this.#nearAccountClient = nearAccountClient;
    this.#pageDataComposer = pageDataComposer;
    this.#events = {
      undockingInit: 'undocking:init',
      undockingSeedused: 'undocking:seedused',
      undocked: 'undocked',
      undockingError: 'undocking:error',
    };
  }

  get events() {
    return this.#events;
  }

  get eventEmitter() {
    return this.#eventEmitter;
  }

  setEventEmitter(eventEmitter) {
    this.#eventEmitter = eventEmitter;
  }

  // #region : public methods
  async dock(data) {
    const account = await this.add(data);
    if (account.state !== 'docking') throw new Error(`Account can not be docked, account state: ${account.state}`);
    await this.#nearAccountClient.grantAccountAccess(account.accountId, account.seedKey.private);
    await this.#nearAccountClient.clearAccountKeys(account.accountId, [account.seedKey.public, account.backupKey.public]);
    await this.#dataAccess.updateOne({accountId: account.accountId}, {state: 'docked'});
    return await this.#dataAccess.readOne({accountId: account.accountId});
  }

  async add(data) {
    const accountDescriptor = await this.#nearAccountClient.retrieveAccountAccessData(data.seedPhrase);
    const existedAccount = await this.#dataAccess.readOne({accountId: accountDescriptor.accountId});
    if (existedAccount) return existedAccount;
    const dockingKeys = this.#nearAccountClient.genKeys(2);
    await this.#nearAccountClient.grantAccountAccess(accountDescriptor.accountId, accountDescriptor.secretKey);
    await this.#nearAccountClient.addAccountKeys(accountDescriptor.accountId, dockingKeys.map((key) => key.publicKey));
    this.#appendDockingData(data, accountDescriptor.accountId, dockingKeys);
    return await this.#dataAccess.create(data);
  }

  async getSingle(accountId) {
    return await this.#dataAccess.readOne({accountId});
  }

  async get(conditions, options) {
    // FIXME: refactor
    const dataPageOptions = this.#dataAccess.composeDataPageOptions(options.page);
    const dataArray = await this.#dataAccess.read(conditions, null, dataPageOptions);
    const collectionTotalLength = await this.#dataAccess.countDocuments(conditions);
    return this.#pageDataComposer(dataArray, options.page, collectionTotalLength);
  }

  async initUndocking(accountId) {
    const account = await this.#dataAccess.readOne({accountId});
    if (!account || account.state === 'undocked' || account.state === 'docking') return false;
    setImmediate(this.#undock.bind(this, account));
    return true;
  }

  // #endregion : public methods

  // #region : private methods
  async #undock(account) {
    let state = account.state;
    try {
      if (state === 'docked') {
        await this.#dataAccess.updateOne({accountId: account.accountId}, {state: 'undocking:init'});
        state = 'undocking:init';
        this.eventEmitter?.emit(this.#events.undockingInit, `undocking:init for account: ${account.accountId}`);
      }

      const dockingKeys = [account.seedKey.public, account.backupKey.public];

      if (state === 'undocking:init') {
        await this.#waitForKeysAdded(account.accountId, dockingKeys, 1);
        await this.#removeKey(account.accountId, account.seedKey);
        await this.#dataAccess.updateOne(
          {accountId: account.accountId},
          {state: 'undocking:seedused', seedKey: {isDeleted: true}},
        );
        state = 'undocking:seedused';
        this.eventEmitter?.emit(this.#events.undockingSeedused, `undocking:seedused for account: ${account.accountId}`);
      }

      if (state === 'undocking:seedused') {
        await this.#waitForKeysAdded(account.accountId, dockingKeys, 2);
        await this.#removeKey(account.accountId, account.backupKey);
        await this.#dataAccess.updateOne({accountId: account.accountId}, {state: 'undocked', backupKey: {isDeleted: true}});
        state = 'undocked';
        this.eventEmitter?.emit(this.#events.undocked, `undocked for account: ${account.accountId}`);
      }

      if (state === 'undocked') {
        await this.#dataAccess.deleteOne({accountId: account.accountId});
      }
    } catch (err) {
      console.log(err);
      this.eventEmitter?.emit(this.#events.undockingError, `undocking:error for account: ${account.accountId}`);
    }
  }

  #appendDockingData(data, accountId, [seedkey, backupKey]) {
    const dockingData = {
      accountId,
      seedKey: {
        private: seedkey.secretKey,
        public: seedkey.publicKey,
        seed: seedkey.seedPhrase,
        isDeleted: false,
      },
      backupKey: {
        private: backupKey.secretKey,
        public: backupKey.publicKey,
        seed: backupKey.seedPhrase,
        isDeleted: false,
      },
      state: 'docking',
    };
    Object.assign(data, dockingData);
  }

  async #waitForKeysAdded(accountId, dockingKeys, numberOfKeys) {
    while (!await this.#nearAccountClient.isAccountKeysAdded(accountId, dockingKeys, numberOfKeys)) {
      await this.#sleep(5 * 1000);
    }
  }

  #sleep(deplay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, deplay);
    });
  }

  async #removeKey(accountId, {private: privateKey, public: publicKey}) {
    await this.#nearAccountClient.grantAccountAccess(accountId, privateKey);
    await this.#nearAccountClient.deleteAccountKeys(accountId, [publicKey]);
  }
  // #endregion : private methods
}
