export class AccountNetwork {
  #service;
  #requestInputsUtil;
  #composeError;

  constructor(service, errorComposer, requestInputsUtil) {
    this.#service = service;
    this.#composeError = errorComposer;
    this.#requestInputsUtil = requestInputsUtil;
  }

  registerRoutes(router) {
    router.post('/accounts', this.addSingle.bind(this));
    router.get('/accounts/:accountId', this.getSingle.bind(this));
    router.get('/accounts', this.get.bind(this));
    router.put('/accounts/:accountId', this.updateSingle.bind(this));
    router.delete('/accounts/:accountId', this.deleteSingle.bind(this));
  }

  async addSingle(req, res, next) {
    try {
      const data = await this.#service.dock(req.body);
      return res.status(201).send(data);
    } catch (err) {
      // FIXME: separate into different errors, handle 400 Invalid Inputs
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  async getSingle(req, res, next) {
    try {
      const data = await this.#service.getSingle(req.params.accountId);
      if (data) {
        return res.status(200).send(data);
      }
      return res.status(404).send(this.#composeError(404, 'No accounts found'));
    } catch (err) {
      // FIXME: separate into different errors
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  async get(req, res, next) {
    try {
      req.query.conditions = this.#requestInputsUtil.parseRequestQueryParam(req.query.conditions);
      req.query.options = this.#requestInputsUtil.parseRequestQueryParam(req.query.options);
      const dataPage = await this.#service.get(req.query.conditions, req.query.options);
      return res.status(200).send(dataPage);
    } catch (err) {
      // FIXME: separate into different errors, handle 400 Invalid Inputs
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  async updateSingle(req, res, next) {
    return res.status(501).send(this.#composeError(501, 'Not Implemented'));
  }

  async deleteSingle(req, res, next) {
    try {
      const isSuccess = await this.#service.initUndocking(req.params.accountId);
      if (isSuccess) {
        return res.status(200).send();
      }
      return res.status(404).send(this.#composeError(404, 'No accounts found'));
    } catch (err) {
      // FIXME: separate into different errors
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }
}
