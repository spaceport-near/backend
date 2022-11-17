export class AuthorizationNetwork {
  static instantiate(authorizationService, errorComposer) {
    return new AuthorizationNetwork(authorizationService, errorComposer);
  }

  #authorizationService;
  #composeError;

  constructor(authorizationService, errorComposer) {
    this.#authorizationService = authorizationService;
    this.#composeError = errorComposer;
  }

  async onVerifyAccess(req, res, next) {
    const isAuthorized = await this.#authorizationService.isAuthorized(req.user?.id);
    if (!isAuthorized) {
      return res.status(401).send(this.#composeError(401, 'Unauthorized'));
    }
    return next();
  }
}

