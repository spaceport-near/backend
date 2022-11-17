/**
 *
 * @class
 * @description data access level for account data model
 */
export class AccountDataAccess {
  #db;
  #makeFlat;
  #modelName;
  #schema;
  #model;

  /**
   * @constructor
   * @param {object} db db object interface(mongoose instance)
   * @param {Function} flatDocUtil util function to make input object flat while update doc in mongodb
   */
  constructor(db, flatDocUtil) {
    this.#db = db;
    this.#makeFlat = flatDocUtil;
    this.#modelName = 'account';
    this.#schema = new db.Schema({
      accountId: {
        type: String,
        index: true,
        unique: true,
        required: true,
      },
      userId: {
        type: String,
        index: true,
        required: true,
      },
      seedKey: {
        private: String,
        public: String,
        seed: String,
        isDeleted: Boolean,
      },
      backupKey: {
        private: String,
        public: String,
        seed: String,
        isDeleted: Boolean,
      },
      state: {
        type: String,
        index: true,
        enum: ['docking', 'docked', 'undocking:init', 'undocking:seedused', 'undocked'],
        default: 'docking',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    });
    this.#model = this.#db.model(this.#modelName, this.#schema, this.#modelName);
  }

  async countDocuments(conditions) {
    if (Object.keys(conditions).length) {
      return await this.#model.countDocuments(conditions);
    }
    return await this.#model.estimatedDocumentCount();
  }

  async create(data) {
    return await this.#model.create(data);
  }

  async read(conditions, projection = null, options = null) {
    // Make flat conditions while don't appears primitive, or key startWith '$'
    const flatConditions = this.#makeFlat(conditions, (subObj, key) => key.startsWith('$'));
    return await this.#model.find(flatConditions, projection, options);
  }

  async readOne(params, projection = null) {
    return await this.#model.findOne(params, projection);
  }

  async updateOne(params, data, options = {}) {
    options.runValidators = true;
    // Make flat update data while don't appears primitive, or key startWith '$'
    const flatUpdateData = this.#makeFlat(data, (subObj, key) => key.startsWith('$'));
    const mongooResponse = await this.#model.updateOne(params, flatUpdateData, options);
    return !!(mongooResponse && mongooResponse.n && mongooResponse.ok);
  }

  async deleteOne(params) {
    const mongooResponse = await this.#model.deleteOne(params);
    return !!(mongooResponse && mongooResponse.n && mongooResponse.ok);
  }
}


